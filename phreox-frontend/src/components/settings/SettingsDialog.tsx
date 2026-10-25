import { Icon } from "@iconify/react";
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react";
import type { PresenceStatus } from "../../lib/phreox.ts";
import { currentUser } from "../../data/users.ts";
import { Avatar } from "../Avatar.tsx";
import { GameLogo } from "../GameLogo.tsx";
import { Modal } from "../Modal.tsx";
import { UserTag } from "../user/UserTag.tsx";

type Section =
  | "account"
  | "appearance"
  | "notifications"
  | "privacy"
  | "presence"
  | "shortcuts";

const sections: { key: Section; label: string; icon: string }[] = [
  { key: "account", label: "Konto", icon: "mdi:account-circle-outline" },
  { key: "appearance", label: "Erscheinungsbild", icon: "mdi:palette-outline" },
  { key: "notifications", label: "Benachrichtigungen", icon: "mdi:bell-outline" },
  { key: "privacy", label: "Datenschutz", icon: "mdi:shield-lock-outline" },
  { key: "presence", label: "Aktivität & Spiele", icon: "mdi:gamepad-variant-outline" },
  { key: "shortcuts", label: "Tastenkürzel", icon: "mdi:keyboard-outline" },
];

type SettingsState = {
  account: {
    displayName: string;
    bio: string;
    tags: string[];
  };
  appearance: {
    theme: "dark" | "light" | "system";
    layout: "comfortable" | "compact";
    timeFormat: "24h" | "12h";
    reduceMotion: boolean;
  };
  notifications: {
    directMessages: boolean;
    mentions: boolean;
    requests: boolean;
    desktop: boolean;
    sound: "none" | "ping" | "chime";
    quietHours: boolean;
    quietFrom: string;
    quietTo: string;
  };
  privacy: {
    readReceipts: boolean;
    typingIndicator: boolean;
    showStatus: boolean;
    whoCanMessage: "friends" | "everyone";
    whoCanRequest: "everyone" | "mutual";
  };
  presence: {
    shareActivity: boolean;
    detectProcesses: boolean;
    detectSteam: boolean;
    pollInterval: "15" | "30" | "60";
  };
};

const defaults: SettingsState = {
  account: {
    displayName: currentUser.displayname,
    bio: currentUser.description,
    tags: currentUser.tags,
  },
  appearance: {
    theme: "dark",
    layout: "comfortable",
    timeFormat: "24h",
    reduceMotion: false,
  },
  notifications: {
    directMessages: true,
    mentions: true,
    requests: true,
    desktop: false,
    sound: "ping",
    quietHours: false,
    quietFrom: "22:00",
    quietTo: "07:00",
  },
  privacy: {
    readReceipts: true,
    typingIndicator: true,
    showStatus: true,
    whoCanMessage: "friends",
    whoCanRequest: "everyone",
  },
  presence: {
    shareActivity: true,
    detectProcesses: true,
    detectSteam: true,
    pollInterval: "15",
  },
};

const shortcuts = [
  { keys: ["Strg", "K"], label: "Suche öffnen" },
  { keys: ["Enter"], label: "Nachricht senden oder Bearbeitung speichern" },
  { keys: ["Shift", "Enter"], label: "Zeilenumbruch in der Nachricht" },
  { keys: ["Esc"], label: "Bearbeitung, Menü oder Dialog schließen" },
];

export function SettingsDialog({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [section, setSection] = useState<Section>("account");
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>();

  const presence = settings.presence;

  // Follow the presence process while the dialog is mounted, which is for the
  // whole session because the header keeps it alive.
  useEffect(() => {
    const bridge = window.phreox;

    if (!bridge) return;

    let active = true;

    bridge.presence
      .status()
      .then((status) => active && setPresenceStatus(status))
      .catch(() => undefined);

    const unsubscribe = bridge.presence.onStatus(setPresenceStatus);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Each change of the detection settings is sent to the detector process.
  useEffect(() => {
    window.phreox?.presence
      .configure({
        intervalSecs: Number(presence.pollInterval),
        enabled: presence.shareActivity,
        detectProcesses: presence.detectProcesses,
        detectSteam: presence.detectSteam,
      })
      .catch(() => undefined);
  }, [presence]);

  const activeSection = sections.find((item) => item.key === section) ??
    sections[0];

  function update<G extends keyof SettingsState>(
    group: G,
    values: Partial<SettingsState[G]>,
  ) {
    setSettings((previous) =>
      ({
        ...previous,
        [group]: { ...previous[group], ...values },
      }) as SettingsState
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[70%] h-[85%] flex overflow-hidden bg-(--background-surface) border border-(--border-panel) rounded-2xl shadow-lg animate-fade-in">
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
              <Icon icon={item.icon} className="w-5 h-5 shrink-0" />
              {item.label}
            </button>
          ))}

          <div className="mt-auto px-3 pt-4 flex items-center gap-2 text-xs text-(--text-dark)">
            <Icon icon="mdi:information-outline" className="w-4 h-4 shrink-0" />
            Änderungen gelten bisher nur in dieser Sitzung.
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <header className="px-10 py-5 flex items-center justify-between border-b border-(--border-surface)">
            <div className="flex items-center gap-3">
              <Icon icon={activeSection.icon} className="w-6 h-6 text-(--text-washed)" />
              <h2 className="text-xl font-semibold">{activeSection.label}</h2>
            </div>

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

          <div className="flex-1 min-h-0 overflow-y-auto p-10">
            <div className="max-w-3xl mx-auto flex flex-col gap-10">
              {section === "account" && (
                <AccountSection
                  values={settings.account}
                  onChange={(values) => update("account", values)}
                />
              )}

              {section === "appearance" && (
                <AppearanceSection
                  values={settings.appearance}
                  onChange={(values) => update("appearance", values)}
                />
              )}

              {section === "notifications" && (
                <NotificationsSection
                  values={settings.notifications}
                  onChange={(values) => update("notifications", values)}
                />
              )}

              {section === "privacy" && (
                <PrivacySection
                  values={settings.privacy}
                  onChange={(values) => update("privacy", values)}
                />
              )}

              {section === "presence" && (
                <PresenceSection
                  values={settings.presence}
                  status={presenceStatus}
                  bridge={window.phreox !== undefined}
                  onChange={(values) => update("presence", values)}
                />
              )}

              {section === "shortcuts" && <ShortcutsSection />}
            </div>
          </div>

          <footer className="px-10 py-4 flex justify-end gap-2 border-t border-(--border-surface)">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm text-(--text-washed) cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-panel) hover:text-(--text-default)"
              onClick={() => setSettings(defaults)}
            >
              Auf Standard zurücksetzen
            </button>
          </footer>
        </div>
      </div>
    </Modal>
  );
}

type SectionProps<G extends keyof SettingsState> = {
  values: SettingsState[G];
  onChange: (values: Partial<SettingsState[G]>) => void;
};

function AccountSection({ values, onChange }: SectionProps<"account">) {
  return (
    <>
      <Group title="Profil" description="So sehen dich andere in Phreox.">
        <div className="flex items-center gap-6">
          <Avatar
            name={values.displayName}
            seed={currentUser.id}
            color={currentUser.color}
            src={currentUser.profilePicture}
            status={currentUser.status}
            size="lg"
          />

          <div className="flex flex-col gap-1">
            <p className="text-lg font-semibold">{values.displayName}</p>

            <UserTag
              username={currentUser.username}
              discriminator={currentUser.discriminator}
              className="text-sm text-(--text-washed)"
            />
          </div>
        </div>

        <Field label="Anzeigename">
          <TextField
            value={values.displayName}
            onChange={(displayName) => onChange({ displayName })}
          />
        </Field>

        <Field label="Beschreibung">
          <TextField
            value={values.bio}
            multiline
            onChange={(bio) => onChange({ bio })}
          />
        </Field>

        <Field label="Tags" hint="Enter zum Hinzufügen, Klick auf × zum Entfernen">
          <TagInput
            tags={values.tags}
            onChange={(tags) => onChange({ tags })}
          />
        </Field>
      </Group>

      <Group
        title="Benutzername"
        description="Der Benutzername ist fest und kann nicht geändert werden."
      >
        <Row
          label="Benutzername"
          description="Zusammen mit der Nummer eindeutig, z. B. zum Hinzufügen als Freund."
        >
          <UserTag
            username={currentUser.username}
            discriminator={currentUser.discriminator}
            className="font-mono text-sm text-(--text-washed)"
          />
        </Row>
      </Group>
    </>
  );
}

function AppearanceSection({ values, onChange }: SectionProps<"appearance">) {
  return (
    <>
      <Group title="Design" description="Farbschema der Oberfläche.">
        <Row
          label="Farbschema"
          description="Hell und System sind in Vorbereitung."
        >
          <Segmented
            label="Farbschema"
            value={values.theme}
            options={[
              { value: "dark", label: "Dunkel" },
              { value: "light", label: "Hell", disabled: true },
              { value: "system", label: "System", disabled: true },
            ]}
            onChange={(theme) => onChange({ theme })}
          />
        </Row>

        <Row label="Reduzierte Bewegung" description="Schaltet Übergänge und Einblendungen ab.">
          <Toggle
            label="Reduzierte Bewegung"
            checked={values.reduceMotion}
            onChange={(reduceMotion) => onChange({ reduceMotion })}
          />
        </Row>
      </Group>

      <Group title="Nachrichten">
        <Row label="Ansicht" description="Abstand und Dichte der Nachrichten im Chat.">
          <Segmented
            label="Ansicht"
            value={values.layout}
            options={[
              { value: "comfortable", label: "Komfortabel" },
              { value: "compact", label: "Kompakt" },
            ]}
            onChange={(layout) => onChange({ layout })}
          />
        </Row>

        <Row label="Zeitformat" description="Anzeige der Uhrzeiten bei Nachrichten.">
          <Segmented
            label="Zeitformat"
            value={values.timeFormat}
            options={[
              { value: "24h", label: "24 Stunden" },
              { value: "12h", label: "12 Stunden" },
            ]}
            onChange={(timeFormat) => onChange({ timeFormat })}
          />
        </Row>
      </Group>
    </>
  );
}

function NotificationsSection({ values, onChange }: SectionProps<"notifications">) {
  return (
    <>
      <Group title="Ereignisse" description="Wann du benachrichtigt wirst.">
        <Row label="Direktnachrichten" description="Neue Nachrichten in Direktchats.">
          <Toggle
            label="Direktnachrichten"
            checked={values.directMessages}
            onChange={(directMessages) => onChange({ directMessages })}
          />
        </Row>

        <Row label="Erwähnungen" description="Wenn dich jemand in einer Gruppe erwähnt.">
          <Toggle
            label="Erwähnungen"
            checked={values.mentions}
            onChange={(mentions) => onChange({ mentions })}
          />
        </Row>

        <Row label="Freundschaftsanfragen" description="Neue eingehende Anfragen.">
          <Toggle
            label="Freundschaftsanfragen"
            checked={values.requests}
            onChange={(requests) => onChange({ requests })}
          />
        </Row>

        <Row
          label="Desktop-Benachrichtigungen"
          description="Auch anzeigen, wenn Phreox im Hintergrund läuft."
        >
          <Toggle
            label="Desktop-Benachrichtigungen"
            checked={values.desktop}
            onChange={(desktop) => onChange({ desktop })}
          />
        </Row>
      </Group>

      <Group title="Ton">
        <Row label="Benachrichtigungston" description="Ton bei neuen Nachrichten.">
          <Select
            label="Benachrichtigungston"
            value={values.sound}
            options={[
              { value: "none", label: "Kein Ton" },
              { value: "ping", label: "Ping" },
              { value: "chime", label: "Chime" },
            ]}
            onChange={(sound) => onChange({ sound })}
          />
        </Row>
      </Group>

      <Group title="Ruhezeiten" description="Keine Benachrichtigungen in diesem Zeitraum.">
        <Row label="Ruhezeiten aktivieren">
          <Toggle
            label="Ruhezeiten aktivieren"
            checked={values.quietHours}
            onChange={(quietHours) => onChange({ quietHours })}
          />
        </Row>

        <div
          className={`grid grid-cols-2 gap-4 transition-opacity duration-200 ease-in-out ${
            values.quietHours ? "opacity-100" : "opacity-40 pointer-events-none"
          }`}
        >
          <Field label="Von">
            <input
              type="time"
              value={values.quietFrom}
              className={inputClass}
              onChange={(event) => onChange({ quietFrom: event.target.value })}
            />
          </Field>

          <Field label="Bis">
            <input
              type="time"
              value={values.quietTo}
              className={inputClass}
              onChange={(event) => onChange({ quietTo: event.target.value })}
            />
          </Field>
        </div>
      </Group>
    </>
  );
}

function PrivacySection({ values, onChange }: SectionProps<"privacy">) {
  return (
    <>
      <Group title="Sichtbarkeit">
        <Row label="Online-Status anzeigen" description="Freunde sehen, wann du online bist.">
          <Toggle
            label="Online-Status anzeigen"
            checked={values.showStatus}
            onChange={(showStatus) => onChange({ showStatus })}
          />
        </Row>

        <Row label="Lesebestätigungen" description="Anderen zeigen, wenn du Nachrichten gelesen hast.">
          <Toggle
            label="Lesebestätigungen"
            checked={values.readReceipts}
            onChange={(readReceipts) => onChange({ readReceipts })}
          />
        </Row>

        <Row label="Schreibt-Anzeige" description="Zeigen, wenn du gerade eine Nachricht schreibst.">
          <Toggle
            label="Schreibt-Anzeige"
            checked={values.typingIndicator}
            onChange={(typingIndicator) => onChange({ typingIndicator })}
          />
        </Row>
      </Group>

      <Group title="Kontakt">
        <Row label="Direktnachrichten erlauben von" description="Wer dir eine Direktnachricht senden darf.">
          <Segmented
            label="Direktnachrichten erlauben von"
            value={values.whoCanMessage}
            options={[
              { value: "friends", label: "Freunden" },
              { value: "everyone", label: "Allen" },
            ]}
            onChange={(whoCanMessage) => onChange({ whoCanMessage })}
          />
        </Row>

        <Row label="Freundschaftsanfragen erlauben von" description="Wer dir eine Anfrage senden darf.">
          <Segmented
            label="Freundschaftsanfragen erlauben von"
            value={values.whoCanRequest}
            options={[
              { value: "everyone", label: "Allen" },
              { value: "mutual", label: "Gemeinsamen Gruppen" },
            ]}
            onChange={(whoCanRequest) => onChange({ whoCanRequest })}
          />
        </Row>
      </Group>
    </>
  );
}

function PresenceSection({ values, onChange, status, bridge }: SectionProps<"presence"> & {
  status?: PresenceStatus;
  bridge: boolean;
}) {
  const statusLine = presenceStatusLine(status, bridge);

  return (
    <>
      <div className="p-4 flex items-center gap-3 bg-(--background-dark) border border-(--border-surface) rounded-2xl">
        {status?.state === "playing" ? (
          <GameLogo
            name={status.game.name}
            src={status.game.icon ?? status.game.image}
          />
        ) : (
          <Icon icon={statusLine.icon} className="w-5 h-5 shrink-0 text-(--text-washed)" />
        )}

        <div className="flex flex-col">
          <p className="text-sm font-medium">{statusLine.title}</p>
          <p className="text-xs text-(--text-dark)">{statusLine.detail}</p>
        </div>
      </div>

      <Group
        title="Spielerkennung"
        description="Erkennt laufende Spiele und zeigt sie in Phreox an."
      >
        <Row label="Spielerkennung aktiv" description="Phreox sucht nach laufenden Spielen.">
          <Toggle
            label="Spielerkennung aktiv"
            checked={values.shareActivity}
            onChange={(shareActivity) => onChange({ shareActivity })}
          />
        </Row>

        <Row label="Aktualisierung" description="Wie oft nach laufenden Spielen gesucht wird.">
          <Segmented
            label="Aktualisierung"
            value={values.pollInterval}
            options={[
              { value: "15", label: "15 s" },
              { value: "30", label: "30 s" },
              { value: "60", label: "60 s" },
            ]}
            onChange={(pollInterval) => onChange({ pollInterval })}
          />
        </Row>
      </Group>

      <Group
        title="Quellen"
        description="Woher Phreox erkennt, welches Spiel läuft."
      >
        <Row
          label="Prozessliste"
          description="Erkennt Spiele an ihren Programmnamen aus der Spieleliste."
        >
          <Toggle
            label="Prozessliste"
            checked={values.detectProcesses}
            onChange={(detectProcesses) => onChange({ detectProcesses })}
          />
        </Row>

        <Row
          label="Steam-Bibliothek"
          description="Erkennt auch installierte Steam-Spiele anhand ihres Installationsordners."
        >
          <Toggle
            label="Steam-Bibliothek"
            checked={values.detectSteam}
            onChange={(detectSteam) => onChange({ detectSteam })}
          />
        </Row>
      </Group>

    </>
  );
}

function presenceStatusLine(status: PresenceStatus | undefined, bridge: boolean) {
  if (!bridge) {
    return {
      icon: "mdi:monitor-off",
      title: "Nur in der Desktop-App verfügbar",
      detail: "Im Browser läuft keine Spielerkennung.",
    };
  }

  switch (status?.state) {
    case "playing":
      return {
        icon: "mdi:gamepad-variant",
        title: `Spielt ${status.game.name}`,
        detail: "Wird in Phreox angezeigt.",
      };
    case "idle":
      return {
        icon: "mdi:sleep",
        title: "Kein Spiel erkannt",
        detail: "Phreox sucht weiter nach laufenden Spielen.",
      };
    case "disabled":
      return {
        icon: "mdi:eye-off-outline",
        title: "Spielerkennung ist ausgeschaltet",
        detail: "Es werden keine Spiele erkannt.",
      };
    default:
      return {
        icon: "mdi:help-circle-outline",
        title: "Spielerkennung läuft nicht",
        detail: "Der Erkennungsprozess ist nicht gestartet.",
      };
  }
}

function ShortcutsSection() {
  return (
    <Group title="Tastatur" description="Häufig genutzte Tastenkürzel in Phreox.">
      <div className="flex flex-col">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.label}
            className="py-4 flex items-center justify-between gap-6 border-b border-(--border-surface)"
          >
            <p>{shortcut.label}</p>

            <div className="flex items-center gap-1">
              {shortcut.keys.map((key) => (
                <kbd
                  key={key}
                  className="px-2 py-0.5 font-sans text-xs bg-(--background-dark) border border-(--border-panel) rounded-md text-(--text-washed)"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Group>
  );
}

const inputClass =
  "px-3 py-2 w-full bg-(--background-dark) border border-(--border-surface) rounded-xl outline-none transition-colors duration-200 ease-in-out focus:border-(--border-raised)";

function Group({ title, description, children }: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-(--text-washed)">
          {title}
        </h3>

        {description && (
          <p className="text-sm text-(--text-dark)">{description}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 p-5 bg-(--background-dark) border border-(--border-surface) rounded-2xl">
        {children}
      </div>
    </section>
  );
}

function Row({ label, description, children }: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div className="min-w-0 flex flex-col gap-1">
        <p>{label}</p>

        {description && (
          <p className="text-sm text-(--text-washed)">{description}</p>
        )}
      </div>

      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-(--text-dark)">{hint}</span>}
    </label>
  );
}

function TextField({ value, placeholder, multiline, onChange }: {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  if (multiline) {
    return (
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        className={`${inputClass} resize-none`}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      value={value}
      placeholder={placeholder}
      className={inputClass}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TagInput({ tags, onChange }: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const tag = draft.trim();

    if (tag && !tags.includes(tag)) onChange([...tags, tag]);

    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }

    if (event.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="px-2 py-2 flex flex-wrap items-center gap-2 bg-(--background-dark) border border-(--border-surface) rounded-xl focus-within:border-(--border-raised)">
      {tags.map((tag) => (
        <span
          key={tag}
          className="pl-3 pr-1 py-1 flex items-center gap-1 bg-(--background-panel) border border-(--border-panel) rounded-xl text-xs text-(--text-washed)"
        >
          {tag}

          <button
            type="button"
            aria-label={`${tag} entfernen`}
            className="p-0.5 rounded-full cursor-pointer transition-colors duration-200 ease-in-out hover:bg-(--background-raised) hover:text-(--text-default)"
            onClick={() => onChange(tags.filter((item) => item !== tag))}
          >
            <Icon icon="mdi:close" className="w-3 h-3" />
          </button>
        </span>
      ))}

      <input
        value={draft}
        placeholder={tags.length === 0 ? "Tag hinzufügen" : ""}
        className="min-w-24 flex-1 px-1 py-1 bg-transparent outline-none text-sm"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="p-1 flex gap-1 bg-(--background-surface) border border-(--border-surface) rounded-xl"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={option.disabled}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 ease-in-out disabled:opacity-40 disabled:cursor-default ${
            value === option.value
              ? "bg-(--background-panel) border border-(--border-panel) text-(--text-default)"
              : "border border-transparent text-(--text-washed) enabled:cursor-pointer enabled:hover:text-(--text-default)"
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      className="px-3 py-2 bg-(--background-surface) border border-(--border-surface) rounded-xl outline-none cursor-pointer transition-colors duration-200 ease-in-out focus:border-(--border-raised)"
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
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
          : "bg-(--background-surface) border-(--border-panel)"
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
