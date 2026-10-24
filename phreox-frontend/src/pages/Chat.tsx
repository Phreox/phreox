import { useState } from "react";
import { useParams } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { ChatInput } from "../components/chat/ChatInput.tsx";
import { ChatSidePanel } from "../components/chat/ChatSidePanel.tsx";
import { ChatTopBar } from "../components/chat/ChatTopBar.tsx";
import { MessageFile } from "../components/chat/Files.tsx";
import type { ChatMessage, Draft } from "../components/chat/types.ts";
import { Markdown } from "../components/Markdown.tsx";
import { chats } from "../data/chats.ts";
import { groups } from "../data/groups.ts";
import { messages } from "../data/messages.ts";
import { currentUser, users } from "../data/users.ts";

export function Chat() {
  const { chatId } = useParams();
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(true);

  const chat = chats.find((chat) => chat.id === chatId);
  const user = chat?.type === "user"
    ? users.find((user) => user.id === chat.userId)
    : undefined;
  const group = chat?.type === "group"
    ? groups.find((group) => group.id === chat.groupId)
    : undefined;

  const name = chat?.type === "user" ? user?.displayname : group?.name;

  const chatMessages: ChatMessage[] = [...messages, ...sentMessages].filter(
    (message) => message.chatId === chatId,
  );

  function handleSend(draft: Draft) {
    if (!chatId) return;

    setSentMessages((previous) => [
      ...previous,
      {
        id: `sent-${Date.now()}`,
        chatId,
        userId: currentUser.id,
        text: draft.text,
        timestamp: new Date().toISOString(),
        files: draft.files,
        gif: draft.gif,
      },
    ]);
  }

  return (
    <div className="h-full flex flex-col">
      <ChatTopBar
        name={name}
        seed={chatId ?? ""}
        color={user?.color}
        src={user?.profilePicture}
        status={user?.status}
        onToggleSidePanel={() => setShowSidePanel(!showSidePanel)}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 p-4 flex flex-col overflow-y-auto">
            <div className="mt-auto flex flex-col gap-3">
              {chatMessages.map((message) => {
                const isOwn = message.userId === currentUser.id;
                const sender = isOwn
                  ? currentUser
                  : users.find((user) => user.id === message.userId);

                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar
                      name={sender?.displayname ?? "?"}
                      seed={message.userId}
                      color={sender?.color}
                      src={sender?.profilePicture}
                    />

                    <div
                      className={`min-w-0 flex flex-col gap-1 ${
                        isOwn ? "items-end text-right" : ""
                      }`}
                    >
                      <p className="text-sm">
                        {sender?.displayname ?? "Deleted user"}
                        <span className="ml-2 text-xs text-(--text-dark)">
                          {new Date(message.timestamp).toLocaleString("de-DE")}
                        </span>
                      </p>

                      {message.text && (
                        <div className="text-(--text-washed)">
                          <Markdown source={message.text} />
                        </div>
                      )}

                      {message.files?.map((file, index) => (
                        <MessageFile key={index} file={file} />
                      ))}

                      {message.gif && (
                        <img
                          src={message.gif}
                          alt="GIF"
                          className="max-w-xs rounded-md"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <ChatInput name={name} onSend={handleSend} />
        </div>

        {showSidePanel && <ChatSidePanel user={user} group={group} />}
      </div>
    </div>
  );
}
