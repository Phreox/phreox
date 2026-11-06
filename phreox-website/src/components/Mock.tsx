import { useState } from "react";
import { Icon } from "./Icons.tsx";
import { useT } from "../i18n.ts";

/** Concentric rings that leave the middle like a sound does. */
export function Ripples({ className = "", color = "var(--violet)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 600 600" className={className} fill="none" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((index) => (
        <circle key={index} className="ripple-ring" cx="300" cy="300" r="290" stroke={color} strokeWidth="2" style={{ animationDelay: `${index * -1.2}s` }} />
      ))}
      <circle cx="300" cy="300" r="290" stroke={color} strokeOpacity="0.14" strokeWidth="2" />
      <circle cx="300" cy="300" r="200" stroke={color} strokeOpacity="0.14" strokeWidth="2" />
      <circle cx="300" cy="300" r="110" stroke={color} strokeOpacity="0.14" strokeWidth="2" />
    </svg>
  );
}

export function Avatar({ letter, color, size = 36, speaking = false }: { letter: string; color: string; size?: number; speaking?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-[#0b0b12] ${speaking ? "speaking" : ""}`} style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>{letter}</span>
  );
}

/** The frame of every picture of the app: it looks like a window of it. */
export function Frame({ children, className = "", label }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <div role="img" aria-label={label} className={`overflow-hidden rounded-3xl border border-(--border-panel) bg-(--background-dark) text-(--text-default) shadow-[0_40px_90px_-30px_rgb(0_0_0/0.8)] ${className}`}>
      {children}
    </div>
  );
}

const roleName = "bg-clip-text text-transparent font-semibold";

// ---- the hero: a space with a conversation that plays out once ----------------------------------------------------

export function AppWindow() {
  const { t } = useT();
  const spaces: [string, string][] = [["P", "#835afc"], ["B", "#ff7a90"], ["N", "#5fd4ff"], ["Z", "#ffd84a"]];
  const channels: { group: string; items: { name: string; icon: "hash" | "megaphone" | "speaker"; on?: boolean; users?: [string, string, boolean][] }[] }[] = [
    { group: "Willkommen", items: [{ name: "willkommen", icon: "megaphone" }, { name: "regeln", icon: "hash" }] },
    { group: "Chat", items: [{ name: "allgemein", icon: "hash", on: true }, { name: "projekte", icon: "hash" }, { name: "memes", icon: "hash" }] },
    { group: "Voice", items: [{ name: "Lounge", icon: "speaker", users: [["L", "#ff7a90", true], ["J", "#5fd4ff", false]] }, { name: "Zocken", icon: "speaker" }] },
  ];
  const members: [string, string, string, string][] = [["Lena", "#ff7a90", "L", "Lead"], ["Jonas", "#5fd4ff", "J", "Developer"], ["Mira", "#c9b9ff", "M", "Developer"], ["Tom", "#ffd84a", "T", "Mitglieder"]];

  return (
    <Frame label="Phreox: ein Space mit Channels, Chat und Mitgliedern" className="flex h-[27rem] sm:h-[31rem] text-sm">
      <div className="hidden w-16 shrink-0 flex-col items-center gap-3 bg-(--background-darkend) py-4 sm:flex">
        {spaces.map(([letter, color], index) => (
          <span key={letter} className={`grid size-11 place-items-center font-bold text-[#0b0b12] ${index === 0 ? "rounded-2xl" : "rounded-full opacity-75"}`} style={{ background: color }}>{letter}</span>
        ))}
      </div>

      <div className="hidden w-52 shrink-0 flex-col bg-(--background-surface) md:flex">
        <div className="relative h-24 shrink-0" style={{ background: "linear-gradient(135deg, #835afc, #ff7a90)" }}>
          <span className="absolute bottom-2 left-3 font-display text-lg font-bold" style={{ fontStretch: "85%" }}>BlueNet</span>
        </div>
        <div className="flex flex-col gap-3 overflow-hidden p-3">
          {channels.map((category) => (
            <div key={category.group} className="flex flex-col gap-0.5">
              <p className="px-2 text-xs font-semibold text-(--text-dark)">{category.group}</p>
              {category.items.map((item) => (
                <div key={item.name}>
                  <p className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${item.on ? "bg-(--background-raised) text-white" : "text-(--text-washed)"}`}><Icon name={item.icon} className="size-4 opacity-70" />{item.name}</p>
                  {item.users?.map(([letter, color, talking]) => (
                    <p key={letter} className="flex items-center gap-2 py-1 pl-7 text-xs text-(--text-washed)"><Avatar letter={letter} color={color} size={20} speaking={talking} />{letter === "L" ? "Lena" : "Jonas"}</p>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-(--background-dark)">
        <p className="flex h-12 shrink-0 items-center gap-2 border-b border-(--border-dark) px-4 font-semibold"><Icon name="hash" className="size-4 opacity-60" />allgemein</p>

        <div className="flex flex-1 flex-col justify-end gap-4 overflow-hidden p-4">
          <div className="arrive flex gap-3" style={{ animationDelay: "0.5s" }}>
            <Avatar letter="L" color="#ff7a90" />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2"><span className={roleName} style={{ backgroundImage: "linear-gradient(90deg, #ff7a90, #ffd84a)" }}>Lena</span><span className="text-xs text-(--text-dark)">19:42</span></p>
              <p className="text-(--text-washed)">Banner und Rollen-Verläufe sind drin. Schaut mal 👀</p>
            </div>
          </div>

          <div className="arrive flex gap-3" style={{ animationDelay: "1.6s" }}>
            <Avatar letter="J" color="#5fd4ff" />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2"><span className="font-semibold text-[#5fd4ff]">Jonas</span><span className="text-xs text-(--text-dark)">19:43</span></p>
              <p className="text-(--text-washed)"><strong className="text-white">Release-Abend</strong> um 20 Uhr im Voice?</p>
              <p className="mt-1.5 flex gap-1.5 text-xs"><span className="rounded-full border border-(--violet) bg-(--violet)/20 px-2 py-0.5">🎉 4</span><span className="rounded-full border border-(--border-panel) px-2 py-0.5">👍 2</span></p>
            </div>
          </div>

          <div className="arrive flex gap-3" style={{ animationDelay: "2.8s" }}>
            <Avatar letter="M" color="#c9b9ff" />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2"><span className="font-semibold text-[#c9b9ff]">Mira</span><span className="text-xs text-(--text-dark)">19:44</span></p>
              <p className="mb-0.5 truncate border-l-2 border-(--border-raised) pl-2 text-xs text-(--text-dark)">Jonas: Release-Abend um 20 Uhr im Voice?</p>
              <p className="text-(--text-washed)">Bin dabei! Snacks bringe ich auch mit: <span className="rounded bg-(--background-raised) px-1.5 text-transparent select-none">Nachos mit Käse</span></p>
            </div>
          </div>

          <div className="arrive flex items-center gap-2 text-xs text-(--text-dark)" style={{ animationDelay: "3.8s" }}>
            <span className="flex gap-1">{[0, 1, 2].map((dot) => <span key={dot} className="bar size-1.5 rounded-full bg-(--text-dark)" style={{ animationDelay: `${dot * 0.15}s` }} />)}</span>
            Tom tippt …
          </div>

          <p className="flex h-11 shrink-0 items-center rounded-xl border border-(--border-surface) bg-(--background-surface) px-4 text-(--text-dark)">Nachricht an #allgemein</p>
        </div>
      </div>

      <div className="hidden w-48 shrink-0 flex-col gap-3 border-l border-(--border-dark) bg-(--background-surface) p-3 lg:flex">
        {members.map(([name, color, letter, role]) => (
          <p key={name} className="flex items-center gap-2.5"><Avatar letter={letter} color={color} size={30} /><span className="min-w-0"><span className="block truncate" style={{ color }}>{name}</span><span className="block truncate text-xs text-(--text-dark)">{role}</span></span></p>
        ))}
      </div>
    </Frame>
  );
}

// ---- roles: simple switches or power values ------------------------------------------------------------------------

export function RolesMock() {
  const { t } = useT();
  const [advanced, setAdvanced] = useState(false);
  const [on, setOn] = useState<Record<string, boolean>>({ manage: false, kick: true, invite: true, write: true });
  const [power, setPower] = useState<Record<string, number>>({ manage: 90, kick: 60, invite: 10, write: 0 });
  const roles: [string, string, string | null, number][] = [["Lead", "#ff7a90", "linear-gradient(90deg, #ff7a90, #ffd84a)", 1], ["Developer", "#5fd4ff", null, 2], ["Moderator", "#ffb86b", null, 3], ["Mitglieder", "#8e91aa", null, 38]];
  const rights = ["manage", "kick", "invite", "write"] as const;

  return (
    <Frame label="Phreox: Rollen bearbeiten" className="grid text-sm sm:grid-cols-[13rem_1fr]">
      <div className="flex flex-col gap-1 border-b border-(--border-dark) bg-(--background-surface) p-3 sm:border-r sm:border-b-0">
        {roles.map(([name, color, gradient, count], index) => (
          <p key={name} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 ${index === 1 ? "bg-(--background-raised)" : ""}`}>
            <span className="text-(--text-dark) select-none" aria-hidden="true">⠿</span>
            <span className="size-2.5 rounded-full" style={{ background: gradient ?? color }} />
            <span className={gradient ? roleName : "font-semibold"} style={gradient ? { backgroundImage: gradient } : { color }}>{name}</span>
            <span className="ml-auto text-xs text-(--text-dark)">{count}</span>
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-xl font-bold" style={{ fontStretch: "85%", color: "#5fd4ff" }}>Developer</p>
          <div role="group" className="flex rounded-xl border border-(--border-surface) bg-(--background-dark) p-1">
            {([false, true] as const).map((mode) => (
              <button key={String(mode)} type="button" aria-pressed={advanced === mode} onClick={() => setAdvanced(mode)} className={`cursor-pointer rounded-lg px-3 py-1 font-medium transition-colors ${advanced === mode ? "bg-(--violet) text-white" : "text-(--text-washed) hover:text-white"}`}>
                {t(mode ? "roles.advanced" : "roles.simple")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {["#e5677f", "#f08a3c", "#eea333", "#9fd36b", "#38b6a8", "#5b8def", "#835afc"].map((color) => <span key={color} className={`size-6 rounded-full ${color === "#5b8def" ? "ring-2 ring-white ring-offset-2 ring-offset-(--background-dark)" : ""}`} style={{ background: color }} />)}
        </div>

        <p className="text-xs text-(--text-dark)">{t(advanced ? "roles.hintAdvanced" : "roles.hintSimple")}</p>

        <ul className="flex flex-col divide-y divide-(--border-dark)">
          {rights.map((right) => (
            <li key={right} className="flex items-center gap-3 py-2.5">
              <span className="flex-1">{t(`roles.perm.${right}` as "roles.perm.manage")}</span>
              {advanced
                ? (
                  <>
                    <input type="range" min={0} max={100} step={10} value={power[right]} aria-label={t(`roles.perm.${right}` as "roles.perm.manage")} className="w-28 accent-(--violet)" onChange={(event) => setPower({ ...power, [right]: Number(event.target.value) })} />
                    <span className="w-8 text-right tabular-nums text-(--text-washed)">{power[right]}</span>
                  </>
                )
                : (
                  <button type="button" role="switch" aria-checked={on[right]} aria-label={t(`roles.perm.${right}` as "roles.perm.manage")} onClick={() => setOn({ ...on, [right]: !on[right] })} className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${on[right] ? "bg-(--violet)" : "bg-(--background-raised)"}`}>
                    <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${on[right] ? "left-[1.375rem]" : "left-0.5"}`} />
                  </button>
                )}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

// ---- voice ------------------------------------------------------------------------------------------------------------

export function VoiceMock() {
  const { t } = useT();
  const people: [string, string, string, boolean][] = [["Lena", "#ff7a90", "L", true], ["Jonas", "#5fd4ff", "J", false], ["Mira", "#c9b9ff", "M", true], ["Tom", "#ffd84a", "T", false]];

  return (
    <Frame label="Phreox: ein Voice-Channel" className="text-sm">
      <p className="flex items-center gap-2 border-b border-(--border-dark) px-4 py-3 font-semibold"><Icon name="speaker" className="size-4 opacity-60" />Lounge</p>

      <div className="grid grid-cols-2 gap-3 p-4">
        {people.map(([name, color, letter, talking]) => (
          <div key={name} className="flex flex-col items-center gap-3 rounded-2xl bg-(--background-surface) px-3 py-5">
            <Avatar letter={letter} color={color} size={64} speaking={talking} />
            <p className="flex items-center gap-2"><span>{name}</span>
              {talking && <span className="flex h-3 items-end gap-0.5" role="img" aria-label={t("voice.speaking")}>{[0, 1, 2].map((bar) => <span key={bar} className="bar h-3 w-0.5 rounded bg-(--volt)" style={{ animationDelay: `${bar * 0.18}s` }} />)}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-(--border-dark) bg-(--background-surface) px-4 py-3">
        <span className="grid size-10 place-items-center rounded-full bg-(--background-raised)"><Icon name="voice" className="size-5" /></span>
        <span className="grid size-10 place-items-center rounded-full bg-(--background-raised)"><Icon name="headphones" className="size-5" /></span>
        <span className="grid h-10 w-14 place-items-center rounded-full bg-[#e5434f]"><Icon name="phoneOff" className="size-5" /></span>
        <span className="ml-2 hidden flex-1 gap-3 sm:flex" aria-hidden="true">
          {[["Lautstärke", "w-3/4"], ["Qualität", "w-1/2"]].map(([label, width]) => (
            <span key={label} className="flex-1 text-xs text-(--text-dark)">{label}<span className="mt-1 block h-1.5 rounded-full bg-(--background-raised)"><span className={`block h-full rounded-full bg-(--violet) ${width}`} /></span></span>
          ))}
        </span>
      </div>
    </Frame>
  );
}

// ---- volt: what grows with each level ---------------------------------------------------------------------------------

const levels = [
  { emojis: 20, stream: "720p30", upload: 10, voice: 64 },
  { emojis: 50, stream: "1080p30", upload: 25, voice: 96 },
  { emojis: 100, stream: "1080p60", upload: 50, voice: 128 },
  { emojis: 150, stream: "1440p60", upload: 100, voice: 192 },
  { emojis: 250, stream: "2160p30", upload: 250, voice: 256 },
  { emojis: 500, stream: "2160p60", upload: 500, voice: 384 },
];

export function VoltMock() {
  const { t } = useT();
  const [level, setLevel] = useState(2);
  const perks = levels[level]!;
  const rows: [string, string][] = [
    [t("volt.emojis"), String(perks.emojis)],
    [t("volt.upload"), `${perks.upload} MB`],
    [t("volt.stream"), perks.stream],
    [t("volt.voice"), `${perks.voice} kbit/s`],
  ];

  return (
    <div className="rounded-3xl bg-(--ink) p-5 text-white shadow-[0_30px_70px_-30px_rgb(0_0_0/0.6)] sm:p-7">
      <div role="group" aria-label={t("volt.level")} className="flex items-center gap-1.5">
        {levels.map((_, index) => (
          <button key={index} type="button" aria-pressed={level === index} onClick={() => setLevel(index)} className={`flex h-12 flex-1 cursor-pointer items-center justify-center rounded-xl font-display text-xl font-bold transition-colors ${index <= level ? "bg-(--volt) text-(--ink)" : "bg-(--background-raised) text-(--text-washed) hover:bg-(--border-panel)"}`} style={{ fontStretch: "85%" }}>
            {index}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-(--text-dark)">{t("volt.level")} {level}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-(--text-washed)">{label}</dt>
            <dd className="display mt-1 text-4xl tabular-nums sm:text-5xl">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 border-t border-white/10 pt-4 text-sm"><span className="text-(--text-dark)">{t("volt.extras")}: </span>{t(`volt.extra.${level}` as "volt.extra.0")}</p>
    </div>
  );
}
