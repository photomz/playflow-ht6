import fetch from "isomorphic-fetch";
import _ from "lodash";

const ADDRESS = "http://54.169.23.157";
// Do not modify types - copied from backend EC2.
// Querying WILL break if frontend types out of sync of backend types.

export type User = {
  playflows: Playflow[];
};

export type Playflow = {
  name: string;
  coverImages: string[];
  vibes: Vibe[];
};

export type Vibe = {
  name: string;
  playlistId: string;
  songs: { id: string; enabled: boolean }[];
};

// End danger zone

const userScopedFetch = async (urlString: string, options?: any) => {
  const url = new URL(urlString);
  url.searchParams.append("id", localStorage.getItem("id")!); // Must exist unless user delete/system crash
  return fetch(url.toString(), options);
};

export const getAllPlayflowPreviews = async (): Promise<any> => {
  fetch(`${ADDRESS}/getUser`).then(async (res) => {
    if (res.status === 200) return res.json();
    else return { error: await res.text() };
  });
};

export function getUser(): Promise<User> {
    return userScopedFetch(`${ADDRESS}/getUser`).then(d => d.json()).then(u => u as User);
}

export function saveUser() {
    return userScopedFetch(`${ADDRESS}/editUser`, { method: 'POST', body: JSON.stringify(currentUser), headers: {'Content-Type': 'application/json'} });
}

export let currentUser: User | null = null;
if(localStorage.getItem('id') != null) {
    getUser().then(u => {
        currentUser = u as User;
    });
}

// TODO: Vir pls write ur weird ass EC2 fetching logic here!
