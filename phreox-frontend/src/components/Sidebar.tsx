import { Icon } from "@iconify/react";
import { NavLink, useNavigate, useParams } from "react-router";
import { chats } from "../data/chats.ts";
import { groups } from "../data/groups.ts";
import { useSection } from "../data/section.ts";
import { users } from "../data/users.ts";
import { Avatar } from "./Avatar.tsx";

export function Sidebar() {
  const section = useSection();

  return (
    <div className="px-4 py-2 w-80 h-full">
      {section === "social" && <SocialSidebar />}
      {section === "spaces" && <SpacesSidebar />}
    </div>
  );
}

export function SocialSidebar() {
  const { chatId } = useParams();

  const groupChats = chats.filter((chat) => chat.type === "group");
  const directChats = chats.filter((chat) => chat.type === "user");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <SocialLink to="/social/friends" icon="mdi:account-group" label="Freunde" />
        <SocialLink to="/social/news" icon="mdi:newspaper-variant-outline" label="News" />
      </div>

      <ChatCategory title="Gruppen" items={groupChats} activeChatId={chatId} />
      <ChatCategory title="Direktnachrichten" items={directChats} activeChatId={chatId} />
    </div>
  );
}

function SocialLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `px-4 py-2 flex items-center gap-2 rounded-xl transition-colors duration-200 ease-in-out ${isActive ? "bg-(--background-surface)" : "hover:bg-(--background-surface)"}`}>
      <Icon icon={icon} className="w-5 h-5 text-(--text-washed)" />
      <p>{label}</p>
    </NavLink>
  );
}

type Chat = (typeof chats)[number];

function ChatCategory({ title, items, activeChatId }: { title: string; items: Chat[]; activeChatId?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="px-2 text-xs uppercase text-(--text-dark)">
        {title} — {items.length}
      </p>

      {items.map((chat) => (
        <ChatItem key={chat.id} chat={chat} active={chat.id === activeChatId} />
      ))}
    </div>
  );
}

function ChatItem({ chat, active }: { chat: Chat; active: boolean }) {
  const navigate = useNavigate();

  const user = chat.type === "user" ? users.find((user) => user.id === chat.userId) : undefined;

  const name = chat.type === "user" ? user?.displayname || "Deleted user" : (groups.find((group) => group.id === chat.groupId)?.name ?? "Unknown group");

  const latestMessage = chat.latestMessage?.text || null;

  return (
    <div className={`px-4 py-2 flex gap-2 rounded-xl transition-colors duration-200 ease-in-out cursor-pointer ${active ? "bg-(--background-surface)" : "hover:bg-(--background-surface)"}`} onClick={() => navigate("/social/chat/" + chat.id)}>
      <Avatar name={name} seed={chat.id} color={user?.color} src={user?.profilePicture} status={user?.status} />

      <div className="min-w-0 flex flex-col justify-center">
        <p>{name}</p>
        {latestMessage && <p className="w-50 text-xs truncate white-breaks">{latestMessage}</p>}
      </div>
    </div>
  );
}

export function SpacesSidebar() {
  return <div></div>;
}

export function SpaceSidebar() {
  return <div></div>;
}
