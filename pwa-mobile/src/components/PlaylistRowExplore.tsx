import React from "react";
import { ReactComponent as ThreeDots } from "../assets/icons/three_dots.svg";

import { Link } from "react-router-dom";
import { Preview } from "../api/spotify";

// More detail (three dots) in Recents header than suggested playlists search query result
export const PlaylistRowExplore = ({
  playflow,
  detail,
}: {
  playflow: Preview;
  detail: boolean;
}) => (
  <div
    className={
      "flex flex-row items-center shadow-md rounded-lg mb-4" +
      (detail ? " bg-gray-200 bg-opacity-50" : "")
    }
  >
    <img
      src={playflow.albumUrl}
      alt="Album cover"
      className="h-16 w-16 mr-2 rounded-tl-lg rounded-bl-lg"
    />
    <div className="flex flex-col text-left flex-1">
      <h3 className="font-bold">{playflow.name}</h3>
      <p className="text-tiny">{playflow.duration}</p>
    </div>
    {detail ? (
      <Link to={`/playflow/${playflow.id}`} className="mr-4">
        <ThreeDots />
      </Link>
    ) : (
      <></>
    )}
  </div>
);
