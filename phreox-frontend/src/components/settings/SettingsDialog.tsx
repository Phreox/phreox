import { Icon } from "@iconify/react";
import { useState } from "react";
import { currentUser } from "../../data/users.ts";
import { Avatar } from "../Avatar.tsx";
import { Modal } from "../Modal.tsx";
import { UserTag } from "../user/UserTag.tsx";

const sections = [
  {
    key: "account",
    label: "Konto",
    icon: "mdi:account-circle-outline",
  },
  {
    key: "appearance",
    label: "Erscheinungsbild",
    icon: "mdi:palette-outline",
  },
  {
    key: "notifications",
    label: "Benachrichtigungen",
    icon: "mdi:bell-outline",
  },
  {
    key: "privacy",
    label: "Datenschutz",
    icon: "mdi:shield-lock-outline",
  },
] as const;

type Section = (typeof sections)[number]["key"];

type ToggleItem = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

const toggleSettings: Record<
  Exclude<Section, "account">,
  ToggleItem[]
> = {
  appearance: [
    {
      key: "compact",
      label: "Kompakte Nachrichten",
      description: "Weniger Abstand zwischen einzelnen Nachrichten",
      enabled: false,
    },
    {
      key: "reduceMotion",
      label: "Bewegung reduzieren",
      description: "Schaltet Übergänge und Einblendungen ab",
      enabled: false,
    },
  ],
  notifications: [
    {
      key: "directMessages",
      label: "Direktnachrichten",
      description: "Benachrichtigung bei neuen Direktnachrichten",
      enabled: true,
    },
    {
      key: "mentions",
      label: "Erwähnungen",
      description: "Benachrichtigung, wenn dich jemand erwähnt",
      enabled: true,
    },
    {
      key: "requests",
      label: "Freundschaftsanfragen",
      description: "Benachrichtigung bei neuen Anfragen",
      enabled: true,
    },
    {
      key: "desktop",
      label: "Desktop-Benachrichtigungen",
      description: "Auch anzeigen, wenn Phreox im Hintergrund läuft",
      enabled: false,
    },
  ],
  privacy: [
    {
      key: "readReceipts",
      label: "Lesebestätigungen",
      description: "Anderen zeigen, wenn du ihre Nachrichten gelesen hast",
      enabled: true,
    },
    {
      key: "showStatus",
      label: "Online-Status anzeigen",
      description: "Freunde sehen, wann du online bist",
      enabled: true,
    },
    {
      key: "openRequests",
      label: "Anfragen von allen",
      description:
        "Auch Nutzer ohne gemeinsame Gruppe dürfen dir Anfragen senden",
      enabled: false,
    },
  ],
};

const inputClass =
  "px-3 py-2 bg-(--background-dark) border border-(--border-surface) rounded-xl outline-none transition-colors duration-200 ease-in-out focus:border-(--border-raised)";

export function SettingsDialog({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("account");
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      Object.values(toggleSettings).flat().map((item) => [
        item.key,
        item.enabled,
      ]),
    )
  );
  const [displayName, setDisplayName] = useState(currentUser.displayname);
  const [bio, setBio] = useState(currentUser.description);

  const activeSection = sections.find((item) => item.key === section) ??
    sections[0];

  function setToggle(key: string, checked: boolean) {
    setToggles((previous) => ({ ...previous, [key]: checked }));
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[85%] h-[85%] flex overflow-hidden bg-(--background-surface) border border-(--border-panel) rounded-2xl shadow-lg animate-fade-in">
        <aside className="w-64 shrink-0 p-4 flex flex-col gap-1 bg-(--background-dark) border-r border-(--border-surface)">
          <p className="px-3 pt-1 pb-3 text-xs uppercase text-(--text-dark)">
            Einstellungen
          </p>

          {sections.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={section === item.key}
              className={`px-3 py-2 flex items-center gap-3 rounded-xl text-sm text-left cursor-pointer transition-colors duration-200 ease-in-out ${
                section === item.key
                  ? "bg-(--background-panel) border border-(--border-panel) text-(--text-default)"
                  : "border border-transparent text-(--text-washed) hover:bg-(--background-surface) hover:text-(--text-default)"
              }`}
              onClick={() => setSection(item.key)}
            >
              <Icon icon={item.icon} className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="px-8 py-5 flex items-center justify-between border-b border-(--border-surface)">
            <h2 className="text-lg font-semibold">{activeSection.label}</h2>

            <button
              type="button"
              aria-label="Schließen"
              title="Schließen"
              className="p-2 rounded-xl text-(--text-washed) cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) hover:text-(--text-default)"
              onClick={onClose}
            >
              <Icon icon="mdi:close" className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto p-8">
            <div className="max-w-2xl flex flex-col gap-6">
              {section === "account" && (
                <>
                  <div className="flex items-center gap-5">
                    <Avatar
                      name={displayName}
                      seed={currentUser.id}
                      color={currentUser.color}
                      src={currentUser.profilePicture}
                      status={currentUser.status}
                      size="lg"
                    />

                    <div className="flex flex-col">
                      <p className="text-lg font-semibold">{displayName}</p>

                      <UserTag
                        username={currentUser.username}
                        discriminator={currentUser.discriminator}
                        className="text-sm text-(--text-washed)"
                      />
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Anzeigename</span>
                    <input
                      value={displayName}
                      className={inputClass}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Beschreibung</span>
                    <textarea
                      rows={3}
                      value={bio}
                      className={`${inputClass} resize-none`}
                      onChange={(event) => setBio(event.target.value)}
                    />
                  </label>
                </>
              )}

              {section !== "account" &&
                toggleSettings[section].map((item) => (
                  <div
                    key={item.key}
                    className="py-4 flex items-center justify-between gap-6 border-b border-(--border-surface)"
                  >
                    <div className="flex flex-col gap-1">
                      <p>{item.label}</p>
                      <p className="text-sm text-(--text-washed)">
                        {item.description}
                      </p>
                    </div>

                    <Toggle
                      label={item.label}
                      checked={toggles[item.key]}
                      onChange={(checked) => setToggle(item.key, checked)}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`relative w-11 h-6 shrink-0 rounded-full border cursor-pointer transition-colors duration-200 ease-in-out ${
        checked
          ? "bg-(--text-default) border-(--text-default)"
          : "bg-(--background-dark) border-(--border-panel)"
      }`}
      onClick={() => onChange(!checked)}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${
          checked
            ? "translate-x-5 bg-(--background-darkend)"
            : "translate-x-0 bg-(--text-washed)"
        }`}
      />
    </button>
  );
}
