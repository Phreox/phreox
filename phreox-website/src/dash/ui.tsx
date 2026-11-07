import { type ReactNode, useState } from "react";

/** The parts of the dashboard. They look like the parts of the app: the same surfaces, borders, radii and colors. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-(--border-surface) bg-(--background-surface) p-5 ${className}`}>{children}</div>;
}

export const inputClass = "w-full rounded-xl border border-(--border-surface) bg-(--background-dark) px-3 py-2 text-sm outline-none transition-colors placeholder:text-(--text-dark) focus:border-(--border-raised)";

const buttonBase = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-default disabled:opacity-50";

export function Button({ children, onClick, kind = "primary", disabled, type = "button", small }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit"; small?: boolean }) {
  const look = kind === "primary" ? "bg-(--brand) text-white hover:bg-(--brand-hover)" : kind === "danger" ? "border border-[#ee0333]/60 text-[#ff7a93] hover:bg-[#ee0333]/15" : "border border-(--border-panel) text-(--text-washed) hover:border-(--brand) hover:text-white";

  return <button type={type} disabled={disabled} onClick={onClick} className={`${buttonBase} ${look} ${small ? "!px-3 !py-1 !text-xs" : ""}`}>{children}</button>;
}

/** A switch you can press: on is the brand color. */
export function Chip({ on, children, onClick, disabled }: { on: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-50 ${on ? "border-(--brand) bg-(--brand) text-white" : "border-(--border-panel) text-(--text-washed) hover:border-(--border-raised) hover:text-white"}`}>
      {children}
    </button>
  );
}

const tones = {
  green: "bg-[#3ecf8e]/15 text-[#3ecf8e]",
  orange: "bg-[#ffb86b]/15 text-[#ffb86b]",
  red: "bg-[#ee0333]/15 text-[#ff7a93]",
  violet: "bg-(--brand)/20 text-(--accent)",
  grey: "bg-white/8 text-(--text-washed)",
} as const;

export type Tone = keyof typeof tones;

export function Pill({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${tones[tone]}`}>{children}</span>;
}

/** The count next to an entry of the menu. */
export function Count({ n, tone = "red" }: { n: number; tone?: Tone }) {
  return n > 0 ? <span className={`ml-auto rounded-full px-1.5 text-[0.7rem] font-bold ${tones[tone]}`}>{n}</span> : null;
}

const hues = ["#835afc", "#3ecf8e", "#ffb86b", "#5aa9ff", "#ff7a93", "#c05cf0", "#4fd1c5"];

/** A round picture with the first letter, in a color that stays the same for the same name. */
export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  let hash = 0;

  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;

  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: hues[hash % hues.length], fontSize: size * 0.42 }}>
      {(name[0] ?? "?").toUpperCase()}
    </span>
  );
}

export function Heading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-dark)">{children}</h2>
      {action}
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-dark) ${className}`}>{children}</th>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-(--border-surface) px-4 py-8 text-center text-sm text-(--text-dark)">{children}</p>;
}

/** Runs an action and keeps its error for the page. */
export function useAction() {
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<unknown>) {
    setError(undefined);

    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  return { error, run };
}

export function ErrorLine({ error }: { error?: string }) {
  return error ? <p role="alert" className="text-sm text-[#ff7a93]">{error}</p> : null;
}

export function ago(time: number, lang: string): string {
  const seconds = Math.round((Date.now() - time) / 1000);
  const format = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  if (seconds < 60) return format.format(-seconds, "second");
  if (seconds < 3600) return format.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return format.format(-Math.round(seconds / 3600), "hour");

  return format.format(-Math.round(seconds / 86400), "day");
}
