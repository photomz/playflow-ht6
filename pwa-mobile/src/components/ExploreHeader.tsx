import { ReactComponent as Search } from "../assets/icons/search.svg";
import { ReactComponent as Refresh } from "../assets/icons/refresh.svg";

import { Link } from "react-router-dom";

export const ExploreHeader = ({ children, refresh }: any) => (
  <div className="flex flex-row items-center">
    <h1 className="flex-1 text-3xl font-bold">{children}</h1>
    <div className="flex items-center ml-2 mr-4">
      <Link to="/search">
        <Search className="mr-4" />
      </Link>
      <button onClick={() => refresh()}>
        <Refresh />
      </button>
    </div>
  </div>
);
