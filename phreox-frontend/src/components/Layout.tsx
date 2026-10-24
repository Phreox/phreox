import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { isSectionType, setSection } from "../data/section.ts";
import { Header } from "./Header.tsx";
import { MemberList } from "./RightSided.tsx";
import { Sidebar } from "./Sidebar.tsx";

export function Layout() {
  const [memberList, setMemberList] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.slice(1);

    if (isSectionType(path)) setSection(path);
  }, [pathname]);

  return (
    <div className="w-screen h-screen flex flex-col bg-(--backgrond-darkend)">
      <Header />

      <div className="w-full h-full flex">
        <Sidebar />

        <div className="flex-1 mt-2 mb-4 mr-4 bg-(--background-surface) border border-(--border-surface) rounded-xl shadow-1xl">
          <Outlet />
        </div>

        {memberList && <MemberList />}
      </div>
    </div>
  );
}
