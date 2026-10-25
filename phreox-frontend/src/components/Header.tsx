import { Icon } from "@iconify/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { currentUser } from "../data/users.ts";
import { sectionTypes, useSection } from "../data/section.ts";
import { Avatar } from "./Avatar.tsx";
import { SettingsDialog } from "./settings/SettingsDialog.tsx";
import { ProfileCard } from "./user/ProfileCard.tsx";

export function Header() {
  const section = useSection();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentSpace, setCurrentSpace] = useState(["Friends", "Jason"]);

  return (
    <div className="w-full h-14 flex items-center pt-2 px-4">
      <div className="flex-1 flex gap-6">
        <div className="w-72 flex gap-6">
          <div className="relative w-full px-2 py-1 flex gap-1 bg-(--background-dark) rounded-xl">
            <div className={`absolute top-1 bottom-1 left-2 w-[calc(50%-0.625rem)] bg-(--background-panel) border border-(--border-panel) rounded-xl transition-transform duration-200 ease-in-out ${section === "spaces" ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0"}`} />

            {sectionTypes.map((sectionType) => (
              <button key={sectionType} type="button" className={`relative flex-1 p-2 flex justify-center items-center rounded-xl text-sm cursor-pointer transition-colors duration-200 ease-in-out ${section === sectionType ? "text-(--text-default)" : "text-(--text-washed) hover:text-(--text-default)"}`} onClick={() => navigate(`/${sectionType}`)}>
                {sectionType === "spaces" ? "Spaces" : "Social"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-(--text-washed)">
          {currentSpace.map((part, index) => (
            <Fragment key={part}>
              {index > 0 && <Icon icon="mdi:keyboard-arrow-right" className="text-(--text-dark)" />}

              <p>{part}</p>
            </Fragment>
          ))}
        </div>
      </div>

      <button type="button" className="group px-4 py-2 w-120 h-full flex justify-between items-center gap-2 bg-(--background-dark) rounded-xl text-(--text-washed) text-sm text-left transition-colors duration-200 ease-in-out cursor-pointer hover:bg-(--background-surface)">
        <div className="min-w-0 flex gap-2 items-center">
          <Icon icon="mdi:search" className="shrink-0 w-5 h-5" />

          <p className="truncate">Channel, person, talk, message or command</p>
        </div>

        <kbd className="shrink-0 px-1 py-0.5 font-sans text-xs bg-(--background-surface) border border-(--border-surface) rounded-md transition-colors duration-200 ease-in-out group-hover:bg-(--background-panel) group-hover:border-(--border-panel)">Strg + K</kbd>
      </button>

      <div className="flex-1 flex justify-end items-center gap-2">
        <Profile />

        <button
          type="button"
          title="Einstellungen"
          aria-label="Einstellungen"
          className="p-2 text-(--text-washed) transition-colors duration-200 ease-in-out cursor-pointer hover:bg-(--background-dark) hover:text-(--text-default) rounded-xl"
          onClick={() => setSettingsOpen(true)}
        >
          <Icon icon="mdi:settings" className="w-5 h-5" />
        </button>

        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </div>
  );
}

export function Profile() {
  const [hidden, setHidden] = useState(true);
  const statusState = useState("Online");
  const [status, setStatus] = statusState;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hidden) return;

    function handleMouseDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setHidden(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setHidden(true);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hidden]);

  return (
    <div ref={ref} className="relative">
      <div className="relative select-none px-4 py-2 w-40 flex justify-between items-center gap-2 transition-colors duration-200 ease-in-out cursor-pointer hover:bg-(--background-dark) rounded-xl" onClick={() => setHidden(!hidden)}>
        <div className="flex gap-2 min-w-0">
          <Avatar name={currentUser.displayname} seed={currentUser.id} color={currentUser.color} src={currentUser.profilePicture} status={status} />

          <div className="flex flex-col min-w-0">
            <p className="text-sm">Tom</p>

            <p className="-mt-1 text-[9pt] truncate">{status}</p>
          </div>
        </div>

        <Icon icon="mdi:keyboard-arrow-down" className={`shrink-0 w-5 h-5 ${!hidden && "rotate-180"} transition-all duration-200 ease-in-out`} />
      </div>
      <ProfileCard edit={true} hidden={hidden} statusState={statusState} />
    </div>
  );
}
