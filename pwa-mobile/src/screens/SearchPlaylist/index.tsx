import PlaylistRow from "../../components/PlaylistRow";
import SearchBar from "../../components/SearchBar";
import close from "../../assets/icons/close.svg";

const a = () => {
  return (
    <>
      <div className="flex flex-col" style={{ padding: "41px 37px" }}>
        <div className="flex">
          <SearchBar />
          <img src={close} />
        </div>
        <span className="font-bold" style={{ margin: "50px 0 17px" }}>
          Suggested Playlists
        </span>
        <PlaylistRow title="Playlist 1" name="Name" />
        <PlaylistRow title="Playlist 1" name="Name" />
        <PlaylistRow title="Playlist 1" name="Name" />
        <PlaylistRow title="Playlist 1" name="Name" />
      </div>
    </>
  );
};
export default a;
