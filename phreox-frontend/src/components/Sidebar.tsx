import { useNavigate, useParams } from "react-router";
import { chats } from "../data/chats.ts";
import { groups } from "../data/groups.ts";
import { useSection } from "../data/section.ts";
import { users } from "../data/users.ts";
import { Avatar } from "./Avatar.tsx";

export function Sidebar() {
  const section = useSection();

  return (
    <div className="px-4 py-2 w-80 h-full">
      {section === "spaces" && <SpacesSidebar />}
      {section === "chats" && <ChatsSidebar />}
    </div>
  );
}

export function ChatsSidebar() {
  const navigate = useNavigate();
  const { chatId } = useParams();

  return (
    <div className="flex flex-col gap-4">
      {chats &&
        chats.map((chat) => {
          const user = chat.type === "user"
            ? users.find((user) => user.id === chat.userId)
            : undefined;

          const name = chat.type === "user"
            ? user?.displayname || "Deleted user"
            : groups.find((group) => group.id === chat.groupId)?.name ??
              "Unknown group";

          const latestMessage = chat.latestMessage?.text || null;

          return (
            <div
              key={chat.id}
              className={`px-4 py-2 flex gap-2 rounded-xl transition-colors duration-200 ease-in-out cursor-pointer ${
                chat.id === chatId
                  ? "bg-(--background-surface)"
                  : "bg-(--background-dark) hover:bg-(--background-surface)"
              }`}
              onClick={() => navigate("/chat/" + chat.id)}
            >
              <Avatar
                name={name}
                seed={chat.id}
                color={user?.color}
                src={user?.profilePicture}
                status={user?.status}
              />

              <div className="flex flex-col justify-center">
                <p>{name}</p>
                {latestMessage && (
                  <p className="w-50 text-xs truncate white-breaks">
                    {latestMessage}
                  </p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function SpacesSidebar() {
  return <div></div>;
}

export function SpaceSidebar() {
  return <div></div>;
}
