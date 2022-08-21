from heapq import heapify, heappop, heappush
import sys
import os
from os.path import abspath, join, dirname, exists
import asyncio
import pickle
from string import punctuation
from csv import writer, QUOTE_MINIMAL
from spotipy import client
from tqdm import tqdm
from functools import partial
from operator import attrgetter
from time import time

from spotipy.oauth2 import SpotifyClientCredentials, SpotifyOauthError

# Move import context up one directory
sys.path.insert(0, abspath(join(dirname(__file__), '..')))

from src.ml_api.lib.base import Base
from src.ml_api.lib.async_spotify import BaseAsyncSpotify

# Many random playlists with far too many songs (20K+) - playlists likely not carefully curated - noise in model
MAX_TRACKS = 500
MIN_TRACKS = 5
MIN_FOLLOWERS = 15
MIN_ALBUMS = 4
MIN_ARTISTS = 3


def path(path):
    return abspath(join(dirname(__file__), *path.split('/')))


PUNCTUATION_REMOVER = str.maketrans(dict.fromkeys(punctuation))


def clean(string):
    return string.translate(PUNCTUATION_REMOVER).strip().lower()


class SpotifyCluster(object):
    """A group/cluster of Spotify clients to increase rate limiting threshold and scraping throughput"""

    def __init__(self, clients):
        self.spcluster = []
        for client in clients:
            auth_manager = SpotifyClientCredentials(
                client_id=client['id'], client_secret=client['secret'])
            sp = BaseAsyncSpotify(auth_manager=auth_manager)
            self.spcluster.append(sp)
        self.requests_handled = 0

    def __get__(self, instance, owner):
        self.requests_handled += 1
        return self.spcluster[self.requests_handled % len(self.spcluster)]


class Scraper:
    # https://stackoverflow.com/questions/265960/best-way-to-strip-punctuation-from-a-string

    GET_A_PLAYLIST = "name,followers(total),tracks(items(track(album(id),artists(id,name),id,name,popularity)),next,offset,total)"
    PICKLE_PATH = path('../assets/state/persist_spscraped.pkl')
    SEARCH_TERM_PATH = path('../assets/state/initial_search_terms.txt')

    _search_terms = open(SEARCH_TERM_PATH).read().split('\n')
    
    state = {
        # Max priority queue, tuple[0] = rank, |higher| = better - https://stackoverflow.com/a/15124115
        'search_queue': [(-1e18, term) for term in _search_terms],
        'playlist_ids': set(),  # Prevent duplicate playlists with similar search terms
        'playlist_num': 0,
        # "Hash map" with no offset, Prevent duplicate search terms in recursive crawl
        'offsets': {term: 0 for term in _search_terms}
    }

    if exists(PICKLE_PATH):
        with open(PICKLE_PATH, 'rb') as f:
            state = pickle.load(f) # Do not support changing of initial input files betwixt runs - ie, initial search term

    SENTENCE_PATH = path(
        f"../assets/sentences/spscraped_{state['playlist_num']}.txt")
    SENTENCE_HASH_PATH = path(
        f"../assets/hash-maps/spscraped_sentence_hash.csv")

    # File writers outside to guarantee file closing outside the asyncio world
    # Flush every line: https://stackoverflow.com/questions/3167494/how-often-does-python-flush-to-a-file
    sentence_hashes_file = open(
        SENTENCE_HASH_PATH, 'a+', buffering=1, encoding='utf-8', newline='')
    sentence_hashes = writer(
        sentence_hashes_file, delimiter=',', quotechar='"', quoting=QUOTE_MINIMAL)
    sentences = open(SENTENCE_PATH, 'a+', buffering=1, encoding='latin-1')

    CLIENTS_PATH = path(f"../assets/state/credentials.txt")
    sp = None
    with open(CLIENTS_PATH) as f:
        clients = [{'id': line.split(' ')[0], 'secret': line.split(' ')[
            1]} for line in f.read().split('\n')]
        # __get__ only applies when auth in class definition: https://python-reference.readthedocs.io/en/latest/docs/dunderdsc/get.html
        sp = SpotifyCluster(clients)

    def __init__(self):
        try:
            asyncio.run(self.run())
        finally:
            self.sentence_hashes_file.close()
            self.sentences.close()
    
    def save_state(self, backup=False):
        """
        Helper: Save scrape state in pickle file
        Backup is option since save files often corrupted
        """
        filepath = path(f'../assets/state/persist_spscraped-{self.state["playlist_num"]}.pkl') if backup else self.PICKLE_PATH
        with open(filepath, 'wb') as f:
            pickle.dump(self.state, f, -1)

    async def write_sentence(self, write_queue):
        """
        Secondary consumer: Exhausting loop that runs in single asyncio task worker
        Avoids race conditions when slice file swapped - many workers writing while file swaps raises silent IOError
        1. Consumes write_queue from self.playlist
        2. Writes raw queue item to sentences file
        """
        while True:
            line_output = await write_queue.get()
            self.sentences.write(line_output)


            if (self.state['playlist_num'] % 1e3 == 0):
                self.save_state()
            
            if (self.state['playlist_num'] % 1e5 == 0):
                self.save_state(backup=True)
                # 100K playlists per file
                self.SENTENCE_PATH = path(
                    f"../assets/sentences/spscraped_{self.state['playlist_num']}.txt")
                # Cannot save in primary consumer - Quasi-race condition to close and open new file before other workers try to consume it
                # If other workers write to file during opening, they will fail silently with IOError - cannot operate on closed file
                new_sentences = open(self.SENTENCE_PATH, 'a+', buffering=1, encoding='latin-1')
                self.sentences.flush()
                self.sentences.close()
                self.sentences = new_sentences
        
            write_queue.task_done()

    @staticmethod
    def is_good_playlist(raw_data: dict):
        """
        Many playlists are random/low-quality.
        5 followers criteria stricter than Million Playlist criteria (of 2) b/c possibly more random b/c not cleaned by Spotify Inc.

        Many random, obscure songs make model filesize bloated. 
        Bluntly reduce corpus by not considering unpopular songs.

        Returns cleaned data (-> good) or False (-> bad)
        """
        num_followers = raw_data['followers']['total']
        if (raw_data == None or num_followers == None or num_followers < MIN_FOLLOWERS):
            return False

        data = {"tracks": [{"artist_id": item['track']['artists'][0]['id'],
                            "artist_name": item['track']['artists'][0]['name'],
                            "album_id": item['track']['album']['id'],
                            "name": item['track']['name'],
                            "id": item['track']['id']
                            } for item in raw_data['tracks']['items']
                           # Item track potentially None - meaning track unavailable or removed
                           if (item['track'] and item['track']['id'] and item['track']['popularity'] > 0)],
                "num_followers": raw_data['followers']["total"],
                "name": raw_data['name']}

        # Set comprehension
        num_artists = len({item['artist_id'] for item in data['tracks']})
        if (num_artists < MIN_ARTISTS):
            return False

        num_albums = len({item['album_id'] for item in data['tracks']})
        if (num_albums < MIN_ALBUMS):
            return False

        return data

    def transform_playlist(self, raw_data):
        """
        Cleans raw playlist data into ML-acceptable format
        Writes to file only if self.is_good_playlist
        """
        # WARN: Any non-async errors in non-async functions will not be caught.
        # No raised errors, just hanging, not knowing what's wrong.
        data = self.is_good_playlist(raw_data)
        if (not data):
            return
        
        # Globally defined initial search terms exhaust quickly
        # Many random names - only add term if good playlist (above)
        # Recursive crawling - take every word in playlist name as a new search term
        new_search_terms = \
            [clean(word)  # Concede to potential empty string - API will reject and unique in set anyway
             # Playlist names can have many words - flatten 2D array
             for word in data['name'].split()
             if clean(word) not in self.state['offsets']] + \
            [clean(item['artist_name'])  # Artist playlist searches include Spotify Official Radio - users can follow too
             for item in data['tracks']
             if clean(item['artist_name']) not in self.state['offsets']] # Check for duplication

        # Rank new terms on current playlist popularity
        for term in new_search_terms:
            heappush(self.state['search_queue'], (-data['num_followers'], term))
        self.state['offsets'].update(
            {term: 0 for term in new_search_terms})    

        sentence = []
        for track in data['tracks']:
            numeric_trackid = Base.to10(track['id'])  # O(n) :(
            sentence.append(numeric_trackid)
        self.sentence_hashes.writerow(
            [data['name'], data['num_followers']])

        return " ".join(sentence)+"\n"

    async def paginate(self, spotify_partial, subkey: str, limit: int = 50, max_limit: int = 1e5) -> None:
        """
        Helper: Async generator that handles pagination and authentication refresh for spotify requests
        Yields: Paginated data
        """
        assert subkey in (
            'tracks', 'playlists')  # Currently sole consumers of function
        data = await spotify_partial()
        # On re-runs with high offset, susceptible to blank data like next()
        # "True" total limit defined by None data and 404 Not Found
        if data and data[subkey]:
            subdata = data[subkey]
            while data:
                # Also very time-consuming to query an enormous playlist - so stop it in its tracks
                if (subkey == 'tracks' and not (MIN_TRACKS < subdata['total'] < MAX_TRACKS)):
                    break
                yield data

                # API's purported "total" items is fake - iterate with next() "pointer" to see what true total is
                # Test yourself - https://developer.spotify.com/console/get-search-item/?q=the&type=playlist&market=&limit=50&offset=25000&include_external=
                if subdata['next'] and subdata['offset']+limit < min(max_limit, subdata['total']):
                    data = await self.sp.next(subdata)
                    if not data:
                        break
                    # API's Get Playlist response with offset is undocumented - only tracks object remains in response.
                    # So we must ban subkey use for playlists with offset
                    # Test yourself - https://api.spotify.com/v1/playlists/4qs3qB532V8nshAr4kE2Aq/tracks?offset=100&limit=100&market=US&additional_types=track
                    subdata = data if subkey == 'tracks' else data[subkey]
                else:
                    break

    async def playlist(self, queue, pbar, write_queue):
        """
        Primary consumer: Exhausting loop that runs in asyncio task worker
        1. Consumes playlist_queue items from self.search
        2. Paginates playlist metadata from API
        3. Calls self.transform_playlist to morph raw data
        4. Puts stringified sentences into sentence file write queue
        """
        while True:
            playlist_id = await queue.get()
            # Ids in queue guaranteed by search() to be unique - so add
            self.state['playlist_ids'].add(playlist_id)
            pbar.total = queue.qsize() + pbar.n  # Update total of tqdm progress bar

            data = None
            idx = 0
            playlist_partial = partial(
                self.sp.playlist, playlist_id=playlist_id, fields=self.GET_A_PLAYLIST, market='US')
            # WARN: All Exceptions in async for loop and pagination function somehow not caught, not shown even when KeybaordInterrupt - just hangs
            async for packet in self.paginate(playlist_partial, subkey='tracks', limit=100):
                if (idx == 0):
                    data = packet
                elif 'items' in packet and packet['items']:
                    # API's Get Playlist response with offset is undocumented - only tracks object remains in response.
                    # Test yourself - https://api.spotify.com/v1/playlists/4qs3qB532V8nshAr4kE2Aq/tracks?offset=100&limit=100&market=US&additional_types=track
                    data['tracks']['items'].extend(packet['items'])
                else:
                    break
                idx += 1
            if data != None:  # Possible no yields
                sentence = self.transform_playlist(data)
                if sentence != None:
                    await write_queue.put(sentence)
                    
                    self.state['playlist_num'] += 1
                    pbar.update(1)
                    pbar.set_postfix({
                        'name': data['name'][:10],
                        'likes': data['followers']["total"]
                    })

            queue.task_done()
            

    async def search(self, queue) -> None:
        """
        Producer: Exhausting loop that runs in asyncio task worker
        1. Gets search term coroutines
        2. Batch queries playlist_ids from API in 50s
        3. Adds each playlist_id to queue
        4. Loop with next 50 playlists in search results (aka 'page 2')
        """
        MAX_LIMIT = 1000
        while len(self.state['search_queue']):
            term = heappop(self.state['search_queue'])[1]
            # "Rehydrate" offsets to resume from previous run
            offset = self.state['offsets'][term]
            if term == '' or offset >= MAX_LIMIT or offset == -1:
                continue
            # Must invoke coroutine inside pagination function - otherwise won't be awaited, so use partial with no extra args
            search_partial = partial(
                self.sp.search, q=term, limit=50, offset=offset, type="playlist")
            async for data in self.paginate(search_partial, subkey='playlists', max_limit=MAX_LIMIT, limit=50):
                # API can only get playlist by one but search API returns in batches of 50
                # So we add 50 items to queue
                add_playlists_to_queue = [queue.put(
                    item['id']) for item in data['playlists']['items']
                    # Possible reptition with similar search terms in crawling - filter for only unique aka not in set
                    if (item['id'] and item['id'] not in self.state['playlist_ids'])]
                await asyncio.gather(*add_playlists_to_queue)
                # Effective "-1" state - if not all playlists processed in queue, will rerun this request
                self.state['offsets'][term] += 50  # Add limit
            self.state['offsets'][term] = -1

    async def run(self):
        """
        Main event loop for managing Asyncio coroutines
        """
        # Without queue, max search workers must be 1 else duplicates in sentences - race conditions
        MAX_WORKERS = (
            1, 60, 1)  
        # Queue must be in same thread, so cannot be class variable: https://stackoverflow.com/questions/62602277/asyncio-queue-get-gets-stuck-on-empty-queue
        queue = asyncio.Queue()  # playlist_id: str
        write_queue = asyncio.Queue() # line_output: str
        pbar = tqdm()  # Progress bar

        first_offsets = heappop(self.state['search_queue'])
        print(
            f"So far, scraped {self.state['playlist_num']} playlists")
        print(f"{len(self.state['search_queue'])} search terms exist, top with {first_offsets}")

        # "Rehydrate" total playlists processed from prior run
        pbar.update(self.state['playlist_num'])
        pbar.total = pbar.n

        producers = [asyncio.create_task(self.search(queue))
                     for _ in range(MAX_WORKERS[0])]
        primary_consumers = [asyncio.create_task(self.playlist(queue, pbar, write_queue))
                     for _ in range(MAX_WORKERS[1])]
        secondary_consumers = [asyncio.create_task(self.write_sentence(write_queue)) for _ in range(MAX_WORKERS[2])]

        try:
            await asyncio.gather(*[*producers, queue.join(), *primary_consumers, write_queue.join(), *secondary_consumers])
        except KeyboardInterrupt:
            print(
                "DO NOT INTERRUPT AGAIN\nCLEANING UP UNLOADED PLAYLISTS\n================")
        finally:
            for worker in primary_consumers:
                worker.cancel()
            for worker in secondary_consumers:
                worker.cancel()


if __name__ == '__main__':
    # import logging, sys
    # logging.basicConfig(stream=sys.stderr, level=logging.DEBUG)
    scraper = Scraper()
