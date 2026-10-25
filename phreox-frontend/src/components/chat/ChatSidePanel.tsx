import { Avatar } from "../Avatar.tsx";
import { UserTag } from "../user/UserTag.tsx";
import { users } from "../../data/users.ts";
import type { GroupData, UserData } from "./types.ts";

export function ChatSidePanel({ user, group }: {
  user?: UserData;
  group?: GroupData;
}) {
  if (group) {
    const members = users.filter((member) => group.members.includes(member.id));

    return (
      <aside className="w-72 shrink-0 p-4 flex flex-col gap-4 overflow-y-auto border-l-2 border-l-(--background-panel)">
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{group.name}</p>
          <p className="text-sm text-(--text-washed)">{group.description}</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase text-(--text-dark)">
            Mitglieder — {members.length}
          </p>

          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-2">
              <Avatar
                name={member.displayname}
                seed={member.id}
                color={member.color}
                src={member.profilePicture}
                status={member.status}
              />

              <div className="min-w-0 flex flex-col">
                <p className="truncate text-sm">{member.displayname}</p>
                <UserTag
                  username={member.username}
                  discriminator={member.discriminator}
                  className="truncate text-xs text-(--text-dark)"
                />
              </div>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (user) {
    return (
      <aside className="w-72 shrink-0 p-4 flex flex-col gap-4 overflow-y-auto border-l-2 border-l-(--background-panel)">
        <div className="flex flex-col items-start gap-3">
          <Avatar
            name={user.displayname}
            seed={user.id}
            color={user.color}
            src={user.profilePicture}
            status={user.status}
            size="lg"
          />

          <div className="flex flex-col">
            <p className="font-semibold">{user.displayname}</p>
            <UserTag
              username={user.username}
              discriminator={user.discriminator}
              className="text-sm text-(--text-washed)"
            />
          </div>
        </div>

        <p className="text-sm text-(--text-washed)">{user.description}</p>

        <div className="flex flex-wrap gap-1">
          {user.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs text-(--text-washed) bg-(--background-panel) border border-(--border-panel) rounded-xl"
            >
              {tag}
            </span>
          ))}
        </div>
      </aside>
    );
  }

  return null;
}
