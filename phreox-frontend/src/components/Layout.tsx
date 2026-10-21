import { useState } from "react";
import { Outlet } from "react-router";
import { Header } from "./Header.tsx";
import { MemberList } from "./RightSided.tsx";
import { Sidebar } from "./Sidebar.tsx";

export function Layout() {
  const [memberList, setMemberList] = useState(false);

  return (
    <div className="w-screen h-screen flex flex-col bg-(--backgrond-darkend)">
      <Header />

      <div className="w-full h-full flex">
        <Sidebar />

        <div className="flex-1 mt-2 mb-4 mx-4 p-8 bg-(--background-surface) border border-(--border-surface) rounded-xl shadow-1xl">
          <Outlet />
        </div>

        {memberList && <MemberList />}
      </div>
    </div>
  );
}
