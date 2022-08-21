import React from "react";
import { Link, Outlet } from "react-router-dom";

import { ReactComponent as Home } from "../assets/icons/home.svg";
import { ReactComponent as Plus } from "../assets/icons/plus.svg";
import { ReactComponent as Compass } from "../assets/icons/compass.svg";
import { ReactComponent as Dot } from "../assets/icons/dot.svg";
import { useState } from "react";

const NavButton = ({ icon, focus, to, setFocus }: any) => (
  <Link
    to={to}
    className={
      "flex items-center flex-col m-3 mt-5 " +
      (to === focus ? "opacity-100" : "opacity-50")
    }
    onClick={() => setFocus(to)}
  >
    {icon}
    {to === focus ? <Dot className="mt-1" /> : <></>}
  </Link>
);

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [focus, setFocus] = useState("/");
  return (
    <div className="bg-teal-100 bg-opacity-100 absolute top-0 right-0 left-0 bottom-0 max-h-screen">
      <main className="overflow-y-scroll bg-teal-100">
        <Outlet />
      </main>
      <footer className="fixed bottom-0 left-0 right-0">
        <div className="h-24 bg-gradient-to-t from-white to-#fff00"></div>
        <div className="bg-white pb-4">
          <nav className="mx-4 px-4 flex justify-between rounded-full bg-teal-600 shadow-xl">
            <NavButton
              to="/"
              icon={<Home />}
              focus={focus}
              setFocus={setFocus}
            />
            <NavButton
              to="/new"
              icon={<Plus />}
              focus={focus}
              setFocus={setFocus}
            />
            <NavButton
              to="/explore"
              icon={<Compass />}
              focus={focus}
              setFocus={setFocus}
            />
          </nav>
        </div>
      </footer>
    </div>
  );
};
export default Layout;
