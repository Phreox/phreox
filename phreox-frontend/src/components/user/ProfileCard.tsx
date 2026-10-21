import { Icon } from "@iconify/react";
import { Dispatch, SetStateAction, useState } from "react";

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
      className={`absolute top-16 right-0 w-80 ${
        hidden ? "hidden" : "flex"
      } flex-col gap-2 bg-(--background-surface) border border-(--border-panel) rounded-xl animate-fade-in`}
    >
      <div className="w-full h-18 bg-(--background-panel) border-b border-(--border-panel) rounded-t-xl">
      </div>

      <div className="absolute top-10 left-3 flex justify-center items-center w-16 h-16 rounded-full bg-[#ae38c2] border-4 border-(--background-surface)">
        <div>T</div>

        <div className="absolute -bottom-0.25 -right-0.25 w-4 h-4 bg-[#33ed66] border-3 border-(--background-darkend) rounded-full">
        </div>
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
  const statusse = [
    { icon: "akar-icons:circle", color: "#33ed70", label: "Online" },
    { icon: "boxicons:moon", color: "#eea333", label: "Away" },
    {
      icon: "akar-icons:circle-minus",
      color: "#ee0333",
      label: "Do not disturb",
    },
    {
      icon: "fluent:presence-offline-10-regular",
      color: "#565656",
      label: "Invisible",
    },
  ];

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
          {statusse &&
            statusse.map((status) => (
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
