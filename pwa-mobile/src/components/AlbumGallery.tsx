import { Link } from "react-router-dom";
import { Preview } from "../api/spotify";

const Tile = ({ playflow }: { playflow: Preview }) => (
  <Link to={`/playflow/${playflow.url}`}>
    <img
      src={playflow.albumUrl}
      alt="Album cover"
      className="h-24 w-24 rounded-lg"
    />
  </Link>
);

export const AlbumGallery = ({ playflows }: { playflows: Preview[] }) => (
  <div className="grid grid-cols-3 gap-4 shadow-xl rounded-lg">
    {playflows.map((p) => (
      <Tile playflow={p} key={p.id} />
    ))}
  </div>
);
