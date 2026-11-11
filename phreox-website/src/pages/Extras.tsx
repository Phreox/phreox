import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon, type IconName } from "../components/Icons.tsx";
import { Glow, InView } from "../components/InView.tsx";
import { RolesMock, VoiceMock, VoltMock } from "../components/Mock.tsx";
import { type Lang, useT } from "../i18n.ts";

type L = Record<Lang, string>;

export function Section({ title, text, children, className = "mt-24" }: { title: string; text?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`mx-auto max-w-[84rem] px-5 ${className}`}>
      <InView>
        <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{title}</h2>
        {text && <p className="mt-3 max-w-3xl text-lg text-(--text-washed)">{text}</p>}
      </InView>
      <div className="mt-10">{children}</div>
    </section>
  );
}

/** Rows with a picture of the app next to an explanation. */
export function FeatureRows() {
  const { lang } = useT();
  const de = lang === "de";
  const rows: { title: string; text: string; points: string[]; picture: ReactNode; tone: string }[] = [
    { title: de ? "Rollen mit Rangfolge" : "Roles with a ranking", text: de ? "Starte einfach wie bei Discord oder schalte Power-Werte frei wie bei TeamSpeak." : "Start simple like Discord or unlock power values like TeamSpeak.", points: de ? ["Ein Schalter pro Recht", "Wer höher steht, darf mehr", "Rollen per Drag & Drop sortieren", "Farben und Verläufe kosten nie etwas"] : ["One switch per permission", "Higher means more power", "Sort roles by drag & drop", "Colours and gradients never cost anything"], picture: <RolesMock />, tone: "#f2f3ff" },
    { title: de ? "Voice, das gut klingt" : "Voice that sounds good", text: de ? "Anrufe und Voice-Channels mit eigenen Sound-Einstellungen und einer Diagnose, wenn es rauscht." : "Calls and voice channels with their own sound settings and a diagnosis when it crackles.", points: de ? ["Lautstärke und Qualität pro Gerät", "Anrufe annehmen, ablehnen oder verpassen", "Verpasste Anrufe stehen im Chat"] : ["Volume and quality per device", "Accept, decline or miss calls", "Missed calls show up in the chat"], picture: <VoiceMock />, tone: "#e3f4ff" },
    { title: de ? "Volt hebt deinen Space" : "Volt lifts your space", text: de ? "Jede Stufe schaltet Emojis, Uploads, Streaming und Entdeckung frei, für alle im Space." : "Each level unlocks emojis, uploads, streaming and discovery for everyone in the space.", points: de ? ["Drei Stufen auf der Phreox-Infrastruktur", "Fünf Stufen auf eigenen Servern", "Farben und Einladungs-URL bleiben frei"] : ["Three levels on the Phreox infrastructure", "Five levels on your own servers", "Colours and invite URL stay free"], picture: <VoltMock />, tone: "#fff4d1" },
  ];

  return (
    <div className="mt-20 flex flex-col gap-6">
      {rows.map((row, index) => (
        <InView key={row.title}>
          <div className="mx-auto grid max-w-[84rem] items-center gap-10 rounded-[2.5rem] px-6 py-10 sm:px-12 lg:grid-cols-2 lg:gap-16" style={{ background: "var(--paper)" }}>
            <div className={index % 2 ? "lg:order-2" : ""}>
              <h3 className="display text-[clamp(2.2rem,4.5vw,3.75rem)]">{row.title}</h3>
              <p className="mt-4 max-w-lg text-lg text-(--text-washed)">{row.text}</p>
              <ul className="mt-6 flex flex-col gap-2.5">{row.points.map((point) => <li key={point} className="flex items-start gap-3"><Icon name="check" className="mt-1 size-4 shrink-0 text-(--violet)" />{point}</li>)}</ul>
            </div>
            <div className="app-dark rounded-3xl">{row.picture}</div>
          </div>
        </InView>
      ))}
    </div>
  );
}

export function Platforms() {
  const { lang } = useT();
  const items: [IconName, string][] = [["windows", "Windows"], ["macos", "macOS"], ["linux", "Linux"], ["android", "Android"], ["globe", lang === "de" ? "Browser" : "Browser"]];

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {items.map(([icon, name], index) => (
        <InView as="li" key={name} delay={index * 70}>
          <Link to="/download" className="lift flex flex-col items-center gap-3 rounded-3xl border border-black/10 bg-(--paper) p-6 text-center">
            <Icon name={icon} className="size-10 text-(--violet)" />
            <span className="display text-2xl">{name}</span>
          </Link>
        </InView>
      ))}
    </ul>
  );
}

const compare: { label: L; values: string[] }[] = [
  { label: { de: "Spaces beitreten", en: "Join spaces" }, values: ["10", "20", "50", "100"] },
  { label: { de: "Eigene Spaces", en: "Own spaces" }, values: ["1", "3", "10", "25"] },
  { label: { de: "Eigene Emojis", en: "Custom emojis" }, values: ["50", "100", "150", "200"] },
  { label: { de: "Streaming", en: "Streaming" }, values: ["1080p30", "1080p60", "2K60", "4K60"] },
  { label: { de: "Uploads", en: "Uploads" }, values: ["10 MB", "50 MB", "100 MB", "500 MB"] },
  { label: { de: "Bilder", en: "Images" }, values: ["–", "1920px", "2560px", "3840px"] },
  { label: { de: "Volt pro Monat", en: "Volt per month" }, values: ["–", "2", "3", "4"] },
  { label: { de: "Zeichen pro Nachricht", en: "Characters per message" }, values: ["2000", "2500", "3000", "4000"] },
  { label: { de: "Preis pro Monat", en: "Price per month" }, values: ["0 €", "2,99 €", "5,99 €", "9,99 €"] },
];

/** Basis and the three tiers of Ember side by side; a click on a column highlights it. */
export function CompareTable() {
  const { lang } = useT();
  const [pick, setPick] = useState(2);
  const heads = [["Basis", "#5865f2"], ["Kit", "#ffb366"], ["Fox", "#ff7a45"], ["Kitsune", "#ff7fae"]];

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-black/10 bg-(--paper) p-3">
      <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-left">
        <thead>
          <tr>
            <th className="p-4" />
            {heads.map(([name, color], index) => (
              <th key={name} className="p-2"><button type="button" onClick={() => setPick(index)} className="display w-full cursor-pointer rounded-2xl px-3 py-3 text-2xl transition active:scale-95" style={pick === index ? { background: color, color: "#23272f" } : { color }}>{name}</button></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compare.map((row) => (
            <tr key={row.label.en} className="group">
              <td className="border-t border-black/10 p-4 font-semibold text-(--text-washed)">{row.label[lang]}</td>
              {row.values.map((value, index) => <td key={index} className={`border-t border-black/10 p-4 text-center transition-colors ${pick === index ? "bg-(--violet)/10 font-bold" : ""}`}>{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How many Volt does a space need, and what does it get? */
export function VoltCalc() {
  const { lang } = useT();
  const de = lang === "de";
  const [volt, setVolt] = useState(5);
  const level = volt >= 10 ? 3 : volt >= 5 ? 2 : volt >= 2 ? 1 : 0;
  const unlocks = [de ? "Noch nichts freigeschaltet." : "Nothing unlocked yet.", de ? "50 Server-Emojis · Streaming 720p60 · Rollen-Symbole · Space-Banner" : "50 server emojis · streaming 720p60 · role icons · space banner", de ? "100 Server-Emojis · Streaming 1080p30 · Öffentliche Entdeckung" : "100 server emojis · streaming 1080p30 · public discovery", de ? "150 Server-Emojis · Streaming 1080p60 · Animiertes Icon und Banner" : "150 server emojis · streaming 1080p60 · animated icon and banner"];
  const next = [2, 5, 10, 10][level];

  return (
    <div className="rounded-[2rem] border border-black/10 bg-(--paper) p-7 sm:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-(--violet)">{de ? "VOLT-RECHNER" : "VOLT CALCULATOR"}</p>
          <p className="display mt-1 text-6xl">{volt} <span className="text-(--violet)">⚡</span></p>
        </div>
        <p key={level} className="display arrive text-4xl text-(--violet)">{level === 0 ? (de ? "Stufe 0" : "Level 0") : `${de ? "Stufe" : "Level"} ${level}`}</p>
      </div>
      <input type="range" min={0} max={12} value={volt} onChange={(event) => setVolt(Number(event.target.value))} className="mt-6 w-full cursor-pointer accent-(--violet)" aria-label="Volt" />
      <div className="mt-1 flex justify-between text-xs text-(--text-dark)"><span>0</span><span>2</span><span>5</span><span>10</span><span>12</span></div>
      <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-(--violet) transition-all duration-500" style={{ width: `${Math.min(100, (volt / 10) * 100)}%` }} /></div>
      <p key={`u${level}`} className="arrive mt-5 text-lg">{unlocks[level]}</p>
      <p className="mt-2 text-(--text-washed)">{level === 3 ? (de ? "Höher geht es nicht: Das ist die letzte Stufe." : "This is the last level.") : (de ? `Noch ${next - volt} Volt bis zur nächsten Stufe.` : `${next - volt} more Volt to the next level.`)}</p>
      <p className="mt-2 text-sm text-(--text-dark)">{de ? `Zusätzliches Volt kostet 2,99 € pro Monat: ${volt} Volt wären ${(volt * 2.99).toFixed(2).replace(".", ",")} € ohne Ember.` : `Extra Volt costs 2.99 € per month: ${volt} Volt would be ${(volt * 2.99).toFixed(2)} € without Ember.`}</p>
    </div>
  );
}

/** The steps from nothing to a lifted space. */
export function Steps({ items }: { items: { icon: IconName; title: L; text: L }[] }) {
  const { lang } = useT();

  return (
    <ol className="grid gap-5 md:grid-cols-3">
      {items.map((item, index) => (
        <InView as="li" key={item.title.en} delay={index * 100}>
          <Glow className="lift relative h-full rounded-3xl border border-black/10 bg-(--paper) p-7">
            <span className="display absolute top-4 right-6 text-7xl opacity-10">{index + 1}</span>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-(--violet) text-white"><Icon name={item.icon} className="size-7" /></span>
            <h3 className="display mt-4 text-3xl">{item.title[lang]}</h3>
            <p className="mt-2 text-(--text-washed)">{item.text[lang]}</p>
          </Glow>
        </InView>
      ))}
    </ol>
  );
}

/** A week of streaks you can click through. */
export function Streak() {
  const { lang } = useT();
  const de = lang === "de";
  const [day, setDay] = useState(1);
  const days = [5, 5, 5, 5, 5, 5, 20];

  return (
    <div className="rounded-[2rem] border border-black/10 bg-(--paper) p-7 sm:p-10">
      <h3 className="display text-4xl">{de ? "Bleib dran" : "Keep it up"}</h3>
      <p className="mt-2 text-(--text-washed)">{de ? "Wer täglich vorbeischaut, bekommt +5. Alle 7 Tage in Folge gibt es +15 extra." : "Check in daily for +5. Every 7 days in a row gives +15 extra."}</p>
      <ul className="mt-6 grid grid-cols-7 gap-2 sm:gap-3">
        {days.map((value, index) => (
          <li key={index}>
            <button type="button" onClick={() => setDay(index + 1)} className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl text-sm font-bold transition active:scale-90 sm:text-lg ${index < day ? "bg-[#ffd84a] text-[#23272f] shadow-[0_8px_18px_-8px_#e0a30c]" : "bg-black/5 text-(--text-dark)"}`}>
              <span className="text-xs font-normal opacity-70">{de ? "Tag" : "Day"} {index + 1}</span>
              +{value}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-lg">🔥 {day} {de ? "Tage in Folge" : "days in a row"} · <span className="font-bold text-[#e0a30c]">{days.slice(0, day).reduce((a, b) => a + b, 0)} ✦</span></p>
    </div>
  );
}

type Q = { q: L; a: L };

const planFaq: Record<string, Q[]> = {
  ember: [
    { q: { de: "Brauche ich Ember, um Phreox zu nutzen?", en: "Do I need Ember to use Phreox?" }, a: { de: "Nein. Ember ist freiwillig, Phreox bleibt für alle nutzbar. Dein Profil zu gestalten ist immer kostenlos.", en: "No. Ember is voluntary, Phreox stays usable for everyone. Customising your profile is always free." } },
    { q: { de: "Kann ich Ember kündigen?", en: "Can I cancel Ember?" }, a: { de: "Ja, in der App unter deinem Ember-Abo über „Kündigen“.", en: "Yes, in the app under your Ember subscription via “Cancel”." } },
    { q: { de: "Kann ich Ember ohne Geld bekommen?", en: "Can I get Ember without paying?" }, a: { de: "Ja: Mit Glimmer, das du durch Benutzen von Phreox bekommst, löst du Tage Ember ein.", en: "Yes: with Glimmer, which you get by using Phreox, you redeem days of Ember." } },
  ],
  volt: [
    { q: { de: "Woher bekomme ich Volt?", en: "Where do I get Volt?" }, a: { de: "Als Ember-Mitglied jeden Monat, zusätzlich kaufbar (höchstens 30) oder mit Glimmer einlösbar.", en: "Every month as an Ember member, additionally purchasable (at most 30) or redeemable with Glimmer." } },
    { q: { de: "Profitieren alle im Space?", en: "Does everyone in the space benefit?" }, a: { de: "Ja. Jede Stufe schaltet etwas für alle im Space frei.", en: "Yes. Each level unlocks something for everyone in the space." } },
    { q: { de: "Und auf eigenen Servern?", en: "And on my own servers?" }, a: { de: "Dort gibt es 5 Stufen, sie brauchen weniger Volt, und Emojis und Uploads setzt die eigene Hardware.", en: "There are 5 levels there, they need less Volt, and your own hardware sets emojis and uploads." } },
  ],
  glimmer: [
    { q: { de: "Kann ich Glimmer kaufen?", en: "Can I buy Glimmer?" }, a: { de: "Nein. Glimmer erspielt man: durch Benutzen von Phreox und für Freunde.", en: "No. You play for Glimmer: by using Phreox and for friends." } },
    { q: { de: "Wofür kann ich Glimmer einlösen?", en: "What can I redeem Glimmer for?" }, a: { de: "Gegen Tage Ember (Kit, Fox, Kitsune) und Tage Volt (1 bis 3 Volt).", en: "For days of Ember (Kit, Fox, Kitsune) and days of Volt (1 to 3 Volt)." } },
    { q: { de: "Zählt ein Pass immer?", en: "Does a pass always count?" }, a: { de: "Ein Pass zählt, solange er besser ist als das, was du schon hast.", en: "A pass counts as long as it is better than what you already have." } },
  ],
};

export function PlanFaq({ page }: { page: string }) {
  const { lang } = useT();
  const [open, setOpen] = useState<number | null>(0);
  const items = planFaq[page] ?? [];

  return (
    <ul className="flex max-w-4xl flex-col gap-3">
      {items.map((item, index) => (
        <li key={item.q.en} className="overflow-hidden rounded-2xl border border-black/10 bg-(--paper)">
          <button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)} className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-4 text-left text-lg font-semibold">
            {item.q[lang]}
            <span className={`text-2xl text-(--violet) transition-transform duration-300 ${open === index ? "rotate-45" : ""}`}>+</span>
          </button>
          <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open === index ? "1fr" : "0fr" }}>
            <p className="overflow-hidden px-6 text-(--text-washed)"><span className="block pb-5">{item.a[lang]}</span></p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A checklist that scores how safe a space is. */
export function SafetyCheck() {
  const { lang } = useT();
  const de = lang === "de";
  const items: L[] = [
    { de: "Zwei-Faktor-Anmeldung ist aktiv", en: "Two-factor sign-in is on" },
    { de: "Es gibt einen Regeln-Channel", en: "There is a rules channel" },
    { de: "Rechte sind nur an Leute vergeben, die sie brauchen", en: "Permissions only go to people who need them" },
    { de: "Kicken und Einladen sind auf wenige Rollen begrenzt", en: "Kicking and inviting are limited to a few roles" },
    { de: "Der Einladungslink steht nur dort, wo ich ihn will", en: "The invite link is only where I want it" },
    { de: "Ich weiß, wie ich Missbrauch dem Support melde", en: "I know how to report abuse to support" },
  ];
  const [done, setDone] = useState<boolean[]>(items.map(() => false));
  const count = done.filter(Boolean).length;
  const verdict = count === items.length ? (de ? "Perfekt abgesichert." : "Perfectly secured.") : count >= 4 ? (de ? "Sieht gut aus." : "Looks good.") : count >= 2 ? (de ? "Ein guter Anfang." : "A good start.") : (de ? "Hak ab, was schon passt." : "Tick what already fits.");

  return (
    <div className="grid gap-6 rounded-[2rem] border border-black/10 bg-(--paper) p-7 sm:p-10 lg:grid-cols-[1.4fr_1fr]">
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={item.en}>
            <label className={`flex cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 transition active:scale-[0.99] ${done[index] ? "bg-[#3ba55d]/15" : "hover:bg-black/5"}`}>
              <input type="checkbox" checked={done[index]} onChange={() => setDone(done.map((value, i) => (i === index ? !value : value)))} className="size-5 cursor-pointer accent-[#3ba55d]" />
              <span className={done[index] ? "font-semibold" : ""}>{item[lang]}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-center justify-center rounded-3xl bg-white/60 p-8 text-center ring-1 ring-black/5">
        <div className="relative size-40">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90"><circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="12" /><circle cx="60" cy="60" r="52" fill="none" stroke="#3ba55d" strokeWidth="12" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - count / items.length)} style={{ transition: "stroke-dashoffset 600ms cubic-bezier(.3,.8,.3,1)" }} /></svg>
          <span className="display absolute inset-0 flex items-center justify-center text-5xl">{count}/{items.length}</span>
        </div>
        <p className="display mt-4 text-2xl">{verdict}</p>
      </div>
    </div>
  );
}

/** How to verify a download with its SHA-256 checksum. */
export function VerifyGuide() {
  const { lang } = useT();
  const de = lang === "de";
  const [os, setOs] = useState(0);
  const [copied, setCopied] = useState(false);
  const systems: [string, string][] = [["Windows", "certutil -hashfile Phreox-Setup.exe SHA256"], ["macOS", "shasum -a 256 Phreox.dmg"], ["Linux", "sha256sum Phreox.AppImage"]];

  return (
    <div className="rounded-[2rem] border border-black/10 bg-(--paper) p-7 sm:p-10">
      <h3 className="display text-4xl">{de ? "Download prüfen" : "Verify your download"}</h3>
      <p className="mt-2 max-w-2xl text-(--text-washed)">{de ? "Vergleiche die SHA-256-Prüfsumme der Datei mit der oben angegebenen. Stimmen beide überein, ist die Datei unverändert." : "Compare the SHA-256 checksum of the file with the one shown above. If both match, the file is unchanged."}</p>
      <div className="mt-5 flex gap-2">
        {systems.map(([name], index) => <button key={name} type="button" onClick={() => setOs(index)} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${os === index ? "bg-(--violet) text-white" : "bg-black/5 text-(--text-washed)"}`}>{name}</button>)}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#14151c] p-4 font-mono text-sm text-[#d6d9ff]">
        <span className="text-[#57f287]">$</span>
        <code key={os} className="arrive min-w-0 flex-1 overflow-x-auto whitespace-nowrap">{systems[os][1]}</code>
        <button type="button" onClick={() => { void navigator.clipboard.writeText(systems[os][1]); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="cursor-pointer rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95">{copied ? `✓ ${de ? "Kopiert" : "Copied"}` : de ? "Kopieren" : "Copy"}</button>
      </div>
    </div>
  );
}
