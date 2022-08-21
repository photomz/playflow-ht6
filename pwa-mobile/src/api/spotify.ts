import fetch from "isomorphic-fetch";
import _ from "lodash";

const authorisedFetch = async (url: string, options?: any): Promise<any> =>
  fetch(
    url,
    _.merge(options, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    })
  ).then((res: Response) => {
    // Access code expired - force refresh page to repeat access token process
    if (res.status === 401) {
      // Remove URL search params so force redirect to Spotify login
      window.location.href = window.location.origin;
      return {};
    } else if (res.status === 204) {
      return {};
    }
    return res.json();
  });

export const getAllSongIdsInLibrary = async (): Promise<string[]> => {
  const getNumSongsInLibrary = async () =>
    authorisedFetch("https://api.spotify.com/v1/me/tracks?limit=1").then(
      (res) => res.total
    );

  const getSongIdsAtOffset = async (offset: number) =>
    authorisedFetch(
      `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`
    ).then((res) => res.items.map((item) => item.track.id));

  const totalSongs = await getNumSongsInLibrary();
  const requestsForLibrary = _.range(0, totalSongs, 50).map((offset) =>
    getSongIdsAtOffset(offset)
  );
  const nestedIds = await Promise.all(requestsForLibrary);
  return _.flatten(nestedIds);
};

export const getAllSongIdsInTop = async (): Promise<string[]> => {
  const getTopSongIdsByLongevity = async (timePeriod: string) =>
    authorisedFetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timePeriod}&limit=50&offset=0`
    ).then((res) => res.items.map((item) => item.id));

  const nestedIds = await Promise.all(
    ["short_term", "medium_term", "long_term"].map(getTopSongIdsByLongevity)
  );

  return _.flatten(nestedIds);
};

export const getSongIdsInPlaylist = async (
  playlistId: string,
  total?: number
): Promise<string[]> => {
  if (!total && total !== 0) {
    total = await authorisedFetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=total&limit=1`
    ).then((res) => res.total);
  }

  const getSongIdsInPlaylistAtOffset = async (
    playlistId: string,
    offset: number
  ) =>
    authorisedFetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track.id)&limit=50&offset=${offset}`
    ).then((res) => res.items.map((item) => item.track.id));

  const requestsForSplices = _.range(0, total, 50).map((offset) =>
    getSongIdsInPlaylistAtOffset(playlistId, offset)
  );

  const nestedIds = await Promise.all(requestsForSplices);
  return _.flatten(nestedIds);
};

export const getAllSongIdsInCustomPlaylists = async (): Promise<string[]> => {
  const getCustomPlaylists = async () =>
    // Important: assumes max of 50 user-created playlists.
    authorisedFetch(`https://api.spotify.com/v1/me/playlists`).then((res) =>
      res.items
        .filter((item) => item.owner.id !== "spotify") // Users tend to spam-add Spotify
        // playlists to library and never delete - not represenative of true interests
        .map((item) => ({ id: item.id, total: item.tracks.total }))
    );

  // Chain requests and parallelise
  const playlists = await getCustomPlaylists();

  const requestsForPlaylistsAndSplices = playlists
    .map(({ id, total }) => getSongIdsInPlaylist(id, total))
    .reduce((p, c) => p.concat(c), []); // Still has duplicates

  const nestedIds = await Promise.all(requestsForPlaylistsAndSplices);

  return _.flatten(nestedIds);
};

export const getAllSongIds = async (): Promise<string[]> => {
  const nestedIds = await Promise.all([
    getAllSongIdsInLibrary(),
    getAllSongIdsInTop(),
    getAllSongIdsInCustomPlaylists(),
  ]);
  const uniqueIds = [...new Set(_.flatten(nestedIds))];
  return uniqueIds;
};

export const getAudioFeatures = async (
  songIds: string[]
): Promise<AudioFeature[]> => {
  const getSplicedFeatures = async (splicedIds): Promise<AudioFeature[]> =>
    authorisedFetch(
      `https://api.spotify.com/v1/audio-features?ids=${splicedIds.join("%2C")}`
    ).then((res) =>
      res.audio_features.map(
        (item): AudioFeature => ({
          groovy: item.danceability,
          energetic: item.energy,
          loud: item.loudness,
          happy: item.valence,
          fastPaced: item.tempo,
          acoustic: item.acousticness,
        })
      )
    );

  const requestsForFeatures = _.range(0, songIds.length, 100).map((offset) =>
    getSplicedFeatures(songIds.slice(offset, offset + 100))
  );

  const nestedFeatures = await Promise.all(requestsForFeatures);
  return _.flatten(nestedFeatures);
};

export type AudioFeature = {
  groovy: string;
  energetic: string;
  loud: string;
  happy: string;
  fastPaced: string;
  acoustic: string;
};

export const searchPlaylists = async (query: string): Promise<Preview[]> =>
  // Important: Only returns top/most relevant 50 playlists.
  authorisedFetch(
    `https://api.spotify.com/v1/search?q=${query}&type=playlist&limit=50`
  ).then((res) =>
    res.playlists.items.map((item) => ({
      name: item.name,
      albumUrl: item.images[0].url,
      author: item.owner.display_name,
      id: item.id,
      url: item.external_urls.spotify,
    }))
  );

export const processTrack = (item: any): Preview => ({
  name: item.name,
  albumUrl: item.album.images[0].url,
  author: item.artists.map((artist) => artist.name).join(", "),
  id: item.id,
  url: item.external_urls.spotify,
  duration: `${Math.floor(item.duration_ms / 1e3 / 60)}:${String(
    Math.round(item.duration_ms / 1e3) % 60
  ).padEnd(2, "0")}`,
});

export const searchSongs = async (query: string): Promise<Preview[]> =>
  // Important: Only returns top/most relevant 50 songs.
  authorisedFetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&limit=50`
  ).then((res) => res.tracks.items.map(processTrack));

export type Preview = {
  name: string;
  albumUrl: string;
  author: string;
  id: string;
  url: string;
  duration?: string;
};

export const getSongs = async (songIds: string[]): Promise<Preview[]> => {
  const getSplicedSongs = async (splicedIds): Promise<Preview[]> =>
    authorisedFetch(
      `https://api.spotify.com/v1/tracks?ids=${splicedIds.join("%2C")}`
    ).then((res) => res.tracks.map(processTrack));

  const requestsForFeatures = _.range(0, songIds.length, 100).map((offset) =>
    getSplicedSongs(songIds.slice(offset, offset + 100))
  );

  const nestedFeatures = await Promise.all(requestsForFeatures);
  return _.flatten(nestedFeatures);
};

export const playSongIdsAndClearQueue = async (
  songIds: string[]
): Promise<any> =>
  authorisedFetch("https://api.spotify.com/v1/me/player/play", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: songIds.map((id) => `spotify:track:${id}`),
    }),
  });

export const queueSingleSongId = async (songId: string): Promise<any> =>
  authorisedFetch(
    `https://api.spotify.com/v1/me/player/queue?uri=spotify%3Atrack%3A${songId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
