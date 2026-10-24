import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import "./index.css";
import { Chat } from "./pages/Chat.tsx";
import { Home } from "./pages/Home.tsx";
import { Space } from "./pages/Space.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/chats" replace />} />

          <Route path="spaces" element={<Home />} />
          <Route path="space/:spaceId" element={<Space />} />

          <Route path="chats" element={<Home />} />
          <Route path="chat/:chatId" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
