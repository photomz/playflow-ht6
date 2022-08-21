import SongRow from "../../../components/SongRow";
import arrow from "../../../assets/icons/left_arrow.svg";

const a = () => {
  return (
    <>
      <div className="flex items-center" style={{ padding: "30px" }}>
        <img src={arrow} />
        <span
          className="font-bold"
          style={{ fontSize: "20px", marginLeft: "30px", marginTop: "2px" }}
        >
          Back to [Playflow Title]
        </span>
      </div>
      <div className="flex flex-col" style={{ padding: "0 42px" }}>
        <div className="flex justify-between" style={{ margin: "0 0 17px" }}>
          <span className="font-bold">Suggested Songs</span>
          <input
            type="checkbox"
            style={{ width: "20px", height: "20px", marginBottom: "20px" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <SongRow title="Song 1" playlist="Playlist" name="Name" />
          <input
            type="checkbox"
            style={{ width: "20px", height: "20px", marginBottom: "20px" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <SongRow title="Song 1" playlist="Playlist" name="Name" />
          <input
            type="checkbox"
            style={{ width: "20px", height: "20px", marginBottom: "20px" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <SongRow title="Song 1" playlist="Playlist" name="Name" />
          <input
            type="checkbox"
            style={{ width: "20px", height: "20px", marginBottom: "20px" }}
          />
        </div>
        <div className="flex justify-between items-center">
          <SongRow title="Song 1" playlist="Playlist" name="Name" />
          <input
            type="checkbox"
            style={{ width: "20px", height: "20px", marginBottom: "20px" }}
          />
        </div>
      </div>
    </>
  );
};
export default a;
