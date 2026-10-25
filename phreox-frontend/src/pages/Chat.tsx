import { Icon } from "@iconify/react";
import { useState } from "react";
import { useParams } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { ChatInput } from "../components/chat/ChatInput.tsx";
import { ChatSidePanel } from "../components/chat/ChatSidePanel.tsx";
import { ChatTopBar } from "../components/chat/ChatTopBar.tsx";
import { MessageFile } from "../components/chat/Files.tsx";
import type { ChatMessage, Draft } from "../components/chat/types.ts";
import { Emoji } from "../components/Emoji.tsx";
import { EmojiPicker } from "../components/EmojiPicker.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { Popover } from "../components/Popover.tsx";
import { chats } from "../data/chats.ts";
import { groups } from "../data/groups.ts";
import { messages } from "../data/messages.ts";
import { currentUser, users } from "../data/users.ts";

// Emoji -> user ids that reacted with it.
type Reactions = Record<string, string[]>;

export function Chat() {
  const { chatId } = useParams();
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reactions>>({});
  const [editing, setEditing] = useState<{ id: string; text: string }>();
  const [openMenuId, setOpenMenuId] = useState<string>();
  const [openReactionId, setOpenReactionId] = useState<string>();
  const [copiedId, setCopiedId] = useState<string>();

  const chat = chats.find((chat) => chat.id === chatId);
  const user = chat?.type === "user"
    ? users.find((user) => user.id === chat.userId)
    : undefined;
  const group = chat?.type === "group"
    ? groups.find((group) => group.id === chat.groupId)
    : undefined;

  const name = chat?.type === "user" ? user?.displayname : group?.name;

  const chatMessages: ChatMessage[] = [...messages, ...sentMessages].filter(
    (message) =>
      message.chatId === chatId && !deletedIds.includes(message.id),
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

  function toggleReaction(messageId: string, emoji: string) {
    setReactions((previous) => {
      const messageReactions = previous[messageId] ?? {};
      const reactedBy = messageReactions[emoji] ?? [];
      const mine = reactedBy.includes(currentUser.id);

      const nextReactedBy = mine
        ? reactedBy.filter((id) => id !== currentUser.id)
        : [...reactedBy, currentUser.id];

      const nextReactions = { ...messageReactions, [emoji]: nextReactedBy };

      if (nextReactedBy.length === 0) delete nextReactions[emoji];

      return { ...previous, [messageId]: nextReactions };
    });
  }

  function startEdit(id: string, text: string) {
    setOpenMenuId(undefined);
    setOpenReactionId(undefined);
    setEditing({ id, text });
  }

  function saveEdit() {
    if (!editing) return;

    const text = editing.text.trim();

    if (text) setEdits((previous) => ({ ...previous, [editing.id]: text }));

    setEditing(undefined);
  }

  function copyText(id: string, text: string) {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);

    window.setTimeout(() => {
      setCopiedId(undefined);
      setOpenMenuId((previous) => (previous === id ? undefined : previous));
    }, 700);
  }

  function deleteMessage(id: string) {
    setDeletedIds((previous) => [...previous, id]);
    setOpenMenuId(undefined);
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
                const text = edits[message.id] ?? message.text;
                const messageReactions = reactions[message.id] ?? {};
                const isEditing = editing?.id === message.id;
                const showActions = openMenuId === message.id ||
                  openReactionId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`group relative flex gap-2 ${
                      isOwn ? "flex-row-reverse" : ""
                    }`}
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

                      {isEditing && editing
                        ? (
                          <div className="w-full max-w-md p-2 flex flex-col gap-2 bg-(--background-dark) border border-(--border-panel) rounded-xl animate-fade-in transition-colors duration-200 ease-in-out focus-within:border-(--border-raised)">
                            <textarea
                              autoFocus
                              rows={1}
                              value={editing.text}
                              placeholder="Nachricht bearbeiten"
                              className="w-full px-2 py-1 field-sizing-content max-h-60 text-left resize-none bg-transparent outline-none text-(--text-default) placeholder:text-(--text-dark)"
                              onFocus={(event) => {
                                const end = event.currentTarget.value.length;
                                event.currentTarget.setSelectionRange(end, end);
                              }}
                              onChange={(event) =>
                                setEditing((previous) =>
                                  previous && {
                                    ...previous,
                                    text: event.target.value,
                                  }
                                )}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  saveEdit();
                                }

                                if (event.key === "Escape") {
                                  setEditing(undefined);
                                }
                              }}
                            />

                            <p className="px-2 text-xs text-(--text-dark)">
                              Enter zum Speichern · Esc zum Abbrechen
                            </p>
                          </div>
                        )
                        : (
                          <div className="animate-fade-in flex flex-col gap-1">
                            {text && (
                              <div className="text-(--text-washed)">
                                <Markdown source={text} />
                              </div>
                            )}

                            {edits[message.id] !== undefined && (
                              <p className="text-xs text-(--text-dark)">
                                bearbeitet
                              </p>
                            )}
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

                      {Object.keys(messageReactions).length > 0 && (
                        <div
                          className={`flex flex-wrap gap-1 ${
                            isOwn ? "justify-end" : ""
                          }`}
                        >
                          {Object.entries(messageReactions).map(
                            ([emoji, reactedBy]) => {
                              const mine = reactedBy.includes(currentUser.id);

                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  title={`${reactedBy.length} Reaktion${
                                    reactedBy.length === 1 ? "" : "en"
                                  }`}
                                  className={`px-3 py-1.5 flex items-center gap-2 rounded-xl text-base cursor-pointer border transition-colors duration-200 ease-in-out ${
                                    mine
                                      ? "bg-(--background-raised) border-(--border-raised) text-(--text-default)"
                                      : "bg-(--background-panel) border-(--border-panel) text-(--text-washed) hover:bg-(--background-raised)"
                                  }`}
                                  onClick={() =>
                                    toggleReaction(message.id, emoji)}
                                >
                                  <Emoji emoji={emoji} />
                                  <span className="text-sm">
                                    {reactedBy.length}
                                  </span>
                                </button>
                              );
                            },
                          )}
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div
                        className={`absolute -top-3 z-10 flex items-center gap-0.5 p-0.5 bg-(--background-panel) border border-(--border-panel) rounded-lg text-(--text-washed) transition-opacity duration-150 ease-in-out ${
                          isOwn ? "right-12" : "right-0"
                        } ${
                          showActions
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                        }`}
                      >
                        {isOwn && (
                          <MessageAction
                            icon="mdi:pencil-outline"
                            label="Bearbeiten"
                            onClick={() => startEdit(message.id, text)}
                          />
                        )}

                        <Popover
                          open={openReactionId === message.id}
                          onClose={() => setOpenReactionId(undefined)}
                          align={isOwn ? "right" : "left"}
                          trigger={
                            <MessageAction
                              icon="mdi:emoticon-plus-outline"
                              label="Reaktion hinzufügen"
                              onClick={() => {
                                setOpenMenuId(undefined);
                                setOpenReactionId(
                                  openReactionId === message.id
                                    ? undefined
                                    : message.id,
                                );
                              }}
                            />
                          }
                        >
                          <EmojiPicker
                            onSelect={(emoji) => {
                              toggleReaction(message.id, emoji);
                              setOpenReactionId(undefined);
                            }}
                          />
                        </Popover>

                        <Popover
                          open={openMenuId === message.id}
                          onClose={() => setOpenMenuId(undefined)}
                          align={isOwn ? "right" : "left"}
                          panelClassName="w-56"
                          trigger={
                            <MessageAction
                              icon="mdi:dots-horizontal"
                              label="Weitere Optionen"
                              onClick={() => {
                                setOpenReactionId(undefined);
                                setOpenMenuId(
                                  openMenuId === message.id
                                    ? undefined
                                    : message.id,
                                );
                              }}
                            />
                          }
                        >
                          <div className="flex flex-col gap-0.5">
                            <MenuItem
                              icon={copiedId === message.id
                                ? "mdi:check"
                                : "mdi:content-copy"}
                              label={copiedId === message.id
                                ? "Kopiert"
                                : "Text kopieren"}
                              onClick={() => copyText(message.id, text)}
                            />

                            {isOwn && (
                              <>
                                <div className="my-1 h-px bg-(--border-panel)" />

                                <MenuItem
                                  icon="mdi:trash-can-outline"
                                  label="Nachricht löschen"
                                  danger
                                  onClick={() => deleteMessage(message.id)}
                                />
                              </>
                            )}
                          </div>
                        </Popover>
                      </div>
                    )}
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

function MessageAction({ icon, label, onClick }: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="p-1.5 rounded-md cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-raised) hover:text-(--text-default)"
      onClick={onClick}
    >
      <Icon icon={icon} className="w-4 h-4" />
    </button>
  );
}

function MenuItem({ icon, label, danger, onClick }: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`group px-2.5 py-2 flex items-center gap-3 rounded-lg text-sm text-left cursor-pointer transition-colors duration-150 ease-in-out ${
        danger
          ? "text-[#ee0333] hover:bg-[#ee0333]/10"
          : "text-(--text-washed) hover:bg-(--background-raised) hover:text-(--text-default)"
      }`}
      onClick={onClick}
    >
      <Icon icon={icon} className="w-4 h-4 shrink-0 transition-transform duration-150 ease-in-out group-hover:scale-110" />
      {label}
    </button>
  );
}
