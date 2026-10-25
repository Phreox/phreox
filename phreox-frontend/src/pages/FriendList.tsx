import { Icon } from "@iconify/react";
import { type FormEvent, useState } from "react";
import type { UserData } from "../components/chat/types.ts";
import { Avatar } from "../components/Avatar.tsx";
import { Modal } from "../components/Modal.tsx";
import { ProfileCard } from "../components/user/ProfileCard.tsx";
import { UserTag } from "../components/user/UserTag.tsx";
import { friendRequests, friends } from "../data/friends.ts";
import { users } from "../data/users.ts";

const tabs = [
  { key: "all", label: "Alle" },
  { key: "online", label: "Online" },
  { key: "pending", label: "Ausstehend" },
] as const;

type Tab = (typeof tabs)[number]["key"];

type Request = {
  id: string;
  direction: "incoming" | "outgoing";
  since: string;
};

function findUser(id: string) {
  return users.find((user) => user.id === id);
}

export function FriendList() {
  const [tab, setTab] = useState<Tab>("all");
  const [friendIds, setFriendIds] = useState(() =>
    friends.map((friend) => friend.id)
  );
  const [requests, setRequests] = useState<Request[]>(() => [
    ...friendRequests,
  ]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const friendUsers = friendIds
    .map(findUser)
    .filter((user): user is UserData => user !== undefined);
  const onlineFriends = friendUsers.filter((user) => user.status === "Online");
  const pendingRequests = requests.flatMap((request) => {
    const user = findUser(request.id);

    return user ? [{ ...request, user }] : [];
  });

  function acceptRequest(id: string) {
    setRequests((previous) => previous.filter((request) => request.id !== id));
    setFriendIds((previous) => [...previous, id]);
  }

  function removeRequest(id: string) {
    setRequests((previous) => previous.filter((request) => request.id !== id));
  }

  function closeAddDialog() {
    setAddOpen(false);
    setUsername("");
    setError(null);
  }

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const [name, discriminator] = username
      .trim()
      .replace(/^@/, "")
      .toLowerCase()
      .split("#");
    const user = users.find((user) =>
      user.username.toLowerCase() === name &&
      (!discriminator || user.discriminator === discriminator)
    );

    if (!user) {
      setError(
        discriminator
          ? "Diesen Benutzernamen mit dieser Nummer gibt es nicht."
          : "Diesen Benutzernamen gibt es nicht.",
      );
      return;
    }

    if (friendIds.includes(user.id)) {
      setError(`${user.displayname} ist bereits dein Freund.`);
      return;
    }

    if (requests.some((request) => request.id === user.id)) {
      setError("Zu diesem Nutzer gibt es bereits eine Anfrage.");
      return;
    }

    setRequests((previous) => [
      ...previous,
      {
        id: user.id,
        direction: "outgoing",
        since: new Date().toISOString(),
      },
    ]);
    closeAddDialog();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-(--background-dark) rounded-xl">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`px-3 py-1.5 flex items-center gap-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-200 ease-in-out ${
                tab === item.key
                  ? "bg-(--background-panel) border border-(--border-panel) text-(--text-default)"
                  : "border border-transparent text-(--text-washed) hover:text-(--text-default)"
              }`}
              onClick={() => setTab(item.key)}
            >
              {item.label}

              {item.key === "pending" && (
                <span className="text-xs text-(--text-dark)">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ml-auto px-3 py-2 flex items-center gap-2 bg-(--background-dark) rounded-xl text-sm text-(--text-washed) transition-colors duration-200 ease-in-out cursor-pointer hover:bg-(--background-panel) hover:text-(--text-default)"
          onClick={() => setAddOpen(true)}
        >
          <Icon icon="mdi:account-plus" className="w-4 h-4" />
          Freund hinzufügen
        </button>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col gap-1 overflow-y-auto">
        {tab === "pending"
          ? (
            <>
              {pendingRequests.length === 0 && (
                <p className="p-2 text-sm text-(--text-dark)">
                  Keine ausstehenden Anfragen.
                </p>
              )}

              {pendingRequests.map(({ user, direction, id }) => (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl transition-colors duration-200 ease-in-out hover:bg-(--background-dark)"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 p-2 flex items-center gap-3 text-left cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <Avatar
                      name={user.displayname}
                      seed={user.id}
                      color={user.color}
                      src={user.profilePicture}
                      status={user.status}
                    />

                    <div className="min-w-0 flex flex-col">
                      <p className="truncate">{user.displayname}</p>
                      <p className="truncate text-xs text-(--text-dark)">
                        {direction === "incoming"
                          ? "Eingehende Anfrage"
                          : "Ausgehende Anfrage"}
                      </p>
                    </div>
                  </button>

                  <div className="shrink-0 flex items-center gap-1 pr-2 text-(--text-washed)">
                    {direction === "incoming" && (
                      <button
                        type="button"
                        title="Annehmen"
                        aria-label="Annehmen"
                        className="p-2 rounded-xl cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) hover:text-(--text-default)"
                        onClick={() => acceptRequest(id)}
                      >
                        <Icon icon="mdi:check" className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      type="button"
                      title={direction === "incoming"
                        ? "Ablehnen"
                        : "Zurückziehen"}
                      aria-label={direction === "incoming"
                        ? "Ablehnen"
                        : "Zurückziehen"}
                      className="p-2 rounded-xl cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) hover:text-(--text-default)"
                      onClick={() => removeRequest(id)}
                    >
                      <Icon icon="mdi:close" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          )
          : (
            <>
              {(tab === "online" ? onlineFriends : friendUsers).length === 0 && (
                <p className="p-2 text-sm text-(--text-dark)">
                  {tab === "online"
                    ? "Gerade ist niemand online."
                    : "Noch keine Freunde."}
                </p>
              )}

              {(tab === "online" ? onlineFriends : friendUsers).map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="p-2 flex items-center gap-3 rounded-xl text-left transition-colors duration-200 ease-in-out cursor-pointer hover:bg-(--background-dark)"
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar
                    name={user.displayname}
                    seed={user.id}
                    color={user.color}
                    src={user.profilePicture}
                    status={user.status}
                  />

                  <div className="min-w-0 flex flex-col">
                    <p className="truncate">{user.displayname}</p>
                    <UserTag
                      username={user.username}
                      discriminator={user.discriminator}
                      className="truncate text-xs text-(--text-dark)"
                    />
                  </div>
                </button>
              ))}
            </>
          )}
      </div>

      <Modal open={selectedUser !== null} onClose={() => setSelectedUser(null)}>
        {selectedUser && (
          <ProfileCard user={selectedUser} floating={false} />
        )}
      </Modal>

      <Modal open={addOpen} onClose={closeAddDialog}>
        <form
          onSubmit={handleAdd}
          className="w-96 p-4 flex flex-col gap-4 bg-(--background-surface) border border-(--border-panel) rounded-xl animate-fade-in"
        >
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Freund hinzufügen</p>
            <p className="text-sm text-(--text-washed)">
              Gib Benutzername und Nummer ein, um eine Freundschaftsanfrage zu senden.
            </p>
          </div>

          <input
            autoFocus
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError(null);
            }}
            placeholder="@benutzername#0000"
            className="px-3 py-2 bg-(--background-dark) border border-(--border-surface) rounded-xl outline-none transition-colors duration-200 ease-in-out focus:border-(--border-raised)"
          />

          {error && <p className="text-sm text-[#ee0333]">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-(--text-washed) cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) hover:text-(--text-default)"
              onClick={closeAddDialog}
            >
              Abbrechen
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-(--background-panel) border border-(--border-panel) rounded-xl cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-raised)"
            >
              Anfrage senden
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
