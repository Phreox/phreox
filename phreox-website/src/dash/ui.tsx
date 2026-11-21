import { type ReactNode, useState } from "react";
import { useT } from "../i18n.ts";

/** The parts of the dashboard. They look like the parts of the app: the same surfaces, borders, radii and colors. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-(--border-surface) bg-(--background-surface) p-5 ${className}`}>{children}</div>;
}

/** A surface with a title row; what it holds starts at the edge, so lists and tables can run from border to border. */
export function Panel({ title, hint, action, children, className = "", flush }: { title?: ReactNode; hint?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`flex min-w-0 flex-col rounded-2xl border border-(--border-surface) bg-(--background-surface) ${className}`}>
      {(title || action) && (
        <header className="flex items-center gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.95rem] font-semibold">{title}</h2>
            {hint && <p className="mt-0.5 text-xs text-(--text-dark)">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? "min-w-0" : `min-w-0 px-5 pb-5 ${title || action ? "" : "pt-5"}`}>{children}</div>
    </section>
  );
}

export const inputClass = "w-full rounded-xl border border-(--border-surface) bg-(--background-dark) px-3 py-2 text-sm outline-none transition-colors placeholder:text-(--text-dark) focus:border-(--brand)";

const buttonBase = "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-50";

const buttonLooks = {
  primary: "bg-(--brand) text-white hover:bg-(--brand-hover)",
  ghost: "border border-(--border-panel) text-(--text-washed) hover:border-(--border-raised) hover:bg-(--background-panel) hover:text-white",
  quiet: "text-(--text-washed) hover:bg-(--background-panel) hover:text-white",
  danger: "border border-[#ee0333]/50 text-[#ff7a93] hover:bg-[#ee0333]/15",
  "danger-solid": "bg-[#d5153f] text-white hover:bg-[#ee0333]",
} as const;

export function Button({ children, onClick, kind = "primary", disabled, type = "button", small, busy, autoFocus, title }: { children: ReactNode; onClick?: () => void; kind?: keyof typeof buttonLooks; disabled?: boolean; type?: "button" | "submit"; small?: boolean; busy?: boolean; autoFocus?: boolean; title?: string }) {
  return (
    <button type={type} title={title} data-autofocus={autoFocus ? "" : undefined} disabled={disabled || busy} onClick={onClick} className={`${buttonBase} ${buttonLooks[kind]} ${small ? "!rounded-lg !px-2.5 !py-1 !text-xs" : ""}`}>
      {busy && <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/** A switch you can press: on is the brand color. */
export function Chip({ on, children, onClick, disabled }: { on: boolean; children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-50 ${on ? "border-(--brand) bg-(--brand) text-white" : "border-(--border-panel) text-(--text-washed) hover:border-(--border-raised) hover:text-white"}`}>
      {children}
    </button>
  );
}

/** One of a few choices, side by side. */
export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl border border-(--border-surface) bg-(--background-dark) p-0.5">
      {options.map((option) => (
        <button key={String(option.value)} type="button" role="radio" aria-checked={option.value === value} className={`cursor-pointer rounded-[0.6rem] px-3 py-1.5 text-xs font-semibold transition-colors ${option.value === value ? "bg-(--background-raised) text-white" : "text-(--text-dark) hover:text-white"}`} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, children, label }: { on: boolean; onChange: (on: boolean) => void; children?: ReactNode; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-(--text-washed)">
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on ? "bg-(--brand)" : "bg-(--background-raised)"}`} onClick={() => onChange(!on)}>
        <span aria-hidden className={`absolute top-0.5 size-4 rounded-full bg-white transition-[left] ${on ? "left-[1.125rem]" : "left-0.5"}`} />
      </button>
      {children}
    </label>
  );
}

/** A field with its name above it and, when it helps, a line below. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-(--text-washed)">{label}</span>
      {children}
      {hint && <span className="text-xs text-(--text-dark)">{hint}</span>}
    </label>
  );
}

export function SearchField({ value, onChange, placeholder, className = "", autoFocus }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string; autoFocus?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--text-dark)" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
      <input data-autofocus={autoFocus ? "" : undefined} type="search" className={`${inputClass} !pl-9`} placeholder={placeholder} aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
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
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** The count next to an entry of the menu. */
export function Count({ n, tone = "red" }: { n: number; tone?: Tone }) {
  return n > 0 ? <span className={`ml-auto rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums ${tones[tone]}`}>{n}</span> : null;
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
      <h2 className="text-[0.95rem] font-semibold">{children}</h2>
      {action}
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-(--text-dark) ${className}`}>{children}</th>;
}

/** A table that scrolls sideways inside its surface, with a head that stays. */
export function TableShell({ children, minWidth = "44rem" }: { children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-(--border-surface) bg-(--background-surface)">
      <table className="dash-table w-full text-sm" style={{ minWidth }}>{children}</table>
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-(--border-panel) px-4 py-10 text-center text-sm text-(--text-dark)">
      <p className="max-w-[46ch]">{children}</p>
      {action}
    </div>
  );
}

/** Lines that stand in for what is still being read. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-2 py-1">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="skeleton h-4" style={{ width: `${90 - index * 14}%` }} />)}
    </div>
  );
}

/** A number with its name; the number is the thing to read. */
export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "volt" }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="truncate text-xs text-(--text-dark)">{label}</p>
      <p className={`display mt-1 text-[2rem] tabular-nums ${tone === "volt" ? "text-(--volt)" : ""}`}>{value ?? "–"}</p>
      {hint && <p className="mt-1 text-xs text-(--text-dark)">{hint}</p>}
    </div>
  );
}

/** A bar for a share of something (memory in use): it turns orange and red as it fills. */
export function Meter({ share, label }: { share: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(share * 100)));
  const color = percent > 90 ? "#ff7a93" : percent > 75 ? "#ffb86b" : "var(--brand)";

  return (
    <div role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${percent}%`, background: color }} />
    </div>
  );
}

/** Names and their values, one pair a line. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
      {rows.map(([name, value]) => <div key={name} className="contents"><dt className="text-(--text-dark)">{name}</dt><dd className="min-w-0 truncate text-right tabular-nums">{value}</dd></div>)}
    </dl>
  );
}

/** Copies a text and says so for a moment. */
export function CopyButton({ text, label, small = true }: { text: string; label?: string; small?: boolean }) {
  const { t } = useT();
  const [copied, setCopied] = useState(false);

  return (
    <Button kind="ghost" small={small} onClick={() => void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    })}>{copied ? t("common.copied") : label ?? t("common.copy")}</Button>
  );
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
  return error ? <p role="alert" className="rounded-xl border border-[#ee0333]/40 bg-[#ee0333]/10 px-3 py-2 text-sm text-[#ff7a93]">{error}</p> : null;
}

export function ago(time: number, lang: string): string {
  const seconds = Math.round((Date.now() - time) / 1000);
  const format = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

  if (seconds < 60) return format.format(-seconds, "second");
  if (seconds < 3600) return format.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return format.format(-Math.round(seconds / 3600), "hour");

  return format.format(-Math.round(seconds / 86400), "day");
}
