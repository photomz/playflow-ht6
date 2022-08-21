import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "./index.css";
import { RecoilRoot } from "recoil";
import * as serviceWorkerRegistration from "./helpers/serviceWorkerRegistration";
import reportWebVitals from "./reportWebVitals";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import ExploreScreen from "./screens/Explore";
import HomeScreen from "./screens/Home";
import NewPlayflowScreen from "./screens/New";
import ViewPlayflowScreen from "./screens/Playflow";
import ViewVibeScreen from "./screens/Playflow/Vibe";
import SearchPlaylistScreen from "./screens/SearchPlaylist";
import SearchScreen from "./screens/Search";
import AllPlayflowsScreen from "./screens/Playflows";
import Layout from "./layout";

const queryClient = new QueryClient();

const rehydrateSpotifyAccess = () => {
  const params = new URLSearchParams({
    client_id: "3248d831f605458ca204b624f0856cd1",
    response_type: "code",
    redirect_uri:
      "https://vrm5n79tz6.execute-api.ap-southeast-1.amazonaws.com/dev/callback",
    scope:
      "user-read-private user-library-modify user-library-read user-top-read playlist-modify-public user-read-currently-playing user-modify-playback-state",
  }).toString();

  // eslint-disable-next-line no-restricted-globals
  const href = new URLSearchParams(location.search);
  const token = href.get("token");
  const id = href.get("id");
  const refresh = href.get("refresh");
  console.log(`Token: ${token}, ID: ${id}, Refresh: ${refresh}`);

  if (!token || !id || !refresh) {
    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  } else {
    localStorage.setItem("token", token);
    localStorage.setItem("id", id);
    localStorage.setItem("refresh", refresh);
  }
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

rehydrateSpotifyAccess();

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomeScreen />} />
        <Route path="explore" element={<ExploreScreen />} />
        <Route path="new" element={<NewPlayflowScreen />} />
        <Route path="playflow" element={<AllPlayflowsScreen />} />
        <Route
          path="playflow/:playflowId"
          element={<ViewPlayflowScreen />}
        ></Route>
        <Route
          path="playflow/:playflowId/:vibeNum"
          element={<ViewVibeScreen />}
        />
        <Route path="search-playlist" element={<SearchPlaylistScreen />} />
        <Route path="search" element={<SearchScreen />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

root.render(
  <React.StrictMode>
    <React.Suspense fallback={<h1>Loading....</h1>}>
      <RecoilRoot>
        <QueryClientProvider client={queryClient}>
          <Router />
          {/* <ReactQueryDevtools initialIsOpen /> */}
        </QueryClientProvider>
      </RecoilRoot>
    </React.Suspense>
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://cra.link/PWA
serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
