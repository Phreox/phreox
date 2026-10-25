import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import "./index.css";
import { Chat } from "./pages/Chat.tsx";
import { FriendList } from "./pages/FriendList.tsx";
import { Home } from "./pages/Home.tsx";
import { News } from "./pages/News.tsx";
import { Space } from "./pages/Space.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/social" replace />} />

          <Route path="spaces" element={<Home />} />
          <Route path="space/:spaceId" element={<Space />} />

          <Route path="social">
            <Route index element={<Navigate to="friends" replace />} />
            <Route path="friends" element={<FriendList />} />
            <Route path="news" element={<News />} />
            <Route path="chat/:chatId" element={<Chat />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
