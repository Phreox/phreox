import { Icon } from "@iconify/react";
import { Dispatch, SetStateAction, useState } from "react";
import { statusStateData } from "../../data/status.ts";
import { currentUser } from "../../data/users.ts";
import { Avatar } from "../Avatar.tsx";

export function ProfileCard(
  { edit, hidden, statusState }: {
    edit: boolean;
    hidden: boolean;
    statusState: [string, Dispatch<SetStateAction<string>>];
  },
) {
  const [tags, setTags] = useState([
    "Developer",
    "Lumen IDE",
    "Nyfplex Studios",
  ]);
  const [status, setStatus] = statusState;

  return (
    <div
      className={`absolute top-16 right-0 z-50 w-80 ${
        hidden ? "hidden" : "flex"
      } flex-col gap-2 bg-(--background-surface) border border-(--border-panel) rounded-xl animate-fade-in`}
    >
      <div className="w-full h-18 bg-(--background-panel) border-b border-(--border-panel) rounded-t-xl">
      </div>

      <div className="absolute top-10 left-3">
        <Avatar
          name={currentUser.displayname}
          seed={currentUser.id}
          color={currentUser.color}
          src={currentUser.profilePicture}
          status={status}
          size="lg"
        />
      </div>

      <div className="p-4 flex flex-col gap-2">
        <div className="w-full h-4"></div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col">
            <p>Tom</p>

            <p className="text-(--text-washed) text-sm">
              @eztxmmc<span className="ml-0.5 text-xs text-(--text-dark)">
                #1404
              </span>
            </p>
          </div>

          <p className="text-(--text-washed) text-sm">
            Backend-Dev, baut Hosting-Zeug und eigene Tools.
          </p>

          <div className="flex flex-wrap gap-1 text-(--text-washed)">
            {tags &&
              tags.map((tag) => (
                <p className="px-2 py-1 flex items-center gap-0.5 bg-(--background-panel) border border-(--border-panel) rounded-xl text-xs">
                  {tag}
                </p>
              ))}
          </div>
        </div>

        {edit && (
          <div>
            <ProfileStatusChange statusState={statusState} />
            <div
              className="px-4 py-2 flex justify-between items-center gap-1 bg-(--background-panel) rounded-xl text-(--text-washed) transition-all duration-200 ease-in-out cursor-pointer hover:bg-(--background-raised)"
              onClick={() => {}}
            >
              <p
                className={`transition-all duration-200 ease-in-out`}
              >
                Edit Profile
              </p>

              <Icon
                icon="mdi:edit"
                className="w-4 h-4"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfileStatusChange(
  { statusState }: { statusState: [string, Dispatch<SetStateAction<string>>] },
) {
  const [show, setShow] = useState(false);
  const [status, setStatus] = statusState;

  return (
    <div className="select-none flex flex-col gap-2">
      <div className="w-full h-0.5 bg-(--background-panel) rounded-xl">
      </div>

      <div
        className="group px-4 py-2 flex justify-between items-center gap-1 bg-(--background-panel) rounded-xl text-(--text-washed) transition-all duration-200 ease-in-out cursor-pointer hover:bg-(--background-raised)"
        onClick={() => setShow(!show)}
      >
        <p>
          Status setzen
        </p>

        <Icon
          icon="mdi:keyboard-arrow-down"
          className={`w-4 h-4 ${
            show && "rotate-180"
          } transition-all duration-200 ease-in-out`}
        />
      </div>
      <div
        className={`grid ${
          show
            ? "mb-2 grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        } rounded-xl transition-all duration-200 ease-in-out`}
        inert={!show}
      >
        <div className="overflow-hidden flex flex-col gap-2">
          {statusStateData &&
            statusStateData.map((status) => (
              <div
                key={status.label}
                className="px-4 py-2 flex items-center gap-2 bg-(--background-panel) rounded-xl text-(--text-washed) transition-all duration-200 ease-in-out cursor-pointer hover:bg-(--background-raised)"
                onClick={() => setStatus(status.label)}
              >
                <Icon
                  icon={status.icon}
                  style={{ color: status.color }}
                  className={`w-4 h-4`}
                />

                <p>{status.label}</p>
              </div>
            ))}
        </div>

        <div
          className={`${
            show && "mt-2"
          } w-full h-0.5 bg-(--background-panel) rounded-xl`}
        >
        </div>
      </div>
    </div>
  );
}
