import React from "react";
import { ReactComponent as RightArrow } from "../../assets/icons/right_arrow.svg";
import { Link } from "react-router-dom";
import { AlbumGallery } from "../../components/AlbumGallery";
import _ from "lodash";
import { PlaylistRowExplore } from "../../components/PlaylistRowExplore";
import { ExploreHeader } from "../../components/ExploreHeader";
import { searchPlaylists } from "../../api/spotify";
import { useQuery } from "@tanstack/react-query";

const Home = () => {
  const { data, isLoading, isFetching } = useQuery(["songIds"], () =>
    searchPlaylists("Happy")
  );

  return (
    <div className="mt-12 mx-6">
      <ExploreHeader>Playflow Library</ExploreHeader>
      <h2 className="font-bold mt-4 mb-2">Recents</h2>
      {isLoading || isFetching
        ? "Loading..."
        : data!
            .slice(0, 4)
            .map((playflow) => (
              <PlaylistRowExplore
                detail
                playflow={playflow}
                key={playflow.id}
              />
            ))}
      <div className="mt-8 mb-2 flex flex-row items-center">
        <h2 className="font-bold">Playflows</h2>
        <Link to="/playflow" className="ml-2">
          <RightArrow className="h-3 w-3" />
        </Link>
      </div>
      {isLoading || isFetching ? (
        "Loading..."
      ) : (
        <AlbumGallery playflows={data!.slice(5, 11)} />
      )}
    </div>
  );
};

export default Home;

// import logo from "./logo.svg";
// import "./App.css";
// import { useQuery } from "@tanstack/react-query";
// import { queueSingleSongId } from "../../api/spotify";
// const { isLoading, error, data, isFetching } = useQuery(["songids"], () =>
//   queueSingleSongId("6L2uVVPJA9WcDc7zCZ4DHN")
//);

// const counterState = atom({
//   key: "counter",
//   default: 0,
//   effects_UNSTABLE: [persist("counter")],
// });
// const [counter, setCounter] = useRecoilState(counterState);
