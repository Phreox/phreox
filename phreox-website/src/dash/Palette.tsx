import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { type TextKey, useT } from "../i18n.ts";
import { useData } from "./data.ts";
import { DashIcon } from "./icons.tsx";
import { useLayer } from "./overlay.tsx";
import type { Intent, Row, Tab } from "./types.ts";
import { Avatar } from "./ui.tsx";

type Entry = { key: string; label: string; hint: string; icon?: string; avatar?: string; run: () => void };

const actions: { intent: Intent; tab: Tab; label: TextKey }[] = [
  { intent: "add-node", tab: "cluster", label: "dash.cluster.add" },
  { intent: "new-token", tab: "testers", label: "dash.tok.create" },
  { intent: "new-post", tab: "news", label: "dash.news.write" },
  { intent: "new-role", tab: "roles", label: "dash.roles.create" },
];

/**
 * The search of the dashboard (Ctrl+K): goes to a page, starts one of the things that are done often, or opens an account by its name.
 */
export function Palette({ allowed, isSuper, go, act, openAccount, lock, onClose }: { allowed: readonly Tab[]; isSuper: boolean; go: (tab: Tab) => void; act: (intent: Intent, tab: Tab) => void; openAccount: (id: string) => void; lock: () => void; onClose: () => void }) {
  const { t } = useT();
  const panel = useLayer(onClose);
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [index, setIndex] = useState(0);
  const needle = query.trim().toLowerCase();
  const accounts = useData<Row[]>(isSuper && asked.length >= 2 ? `/admin/accounts?query=${encodeURIComponent(asked)}` : null).value;

  useEffect(() => {
    const timer = window.setTimeout(() => setAsked(needle), 200);

    return () => window.clearTimeout(timer);
  }, [needle]);

  const entries = useMemo(() => {
    const pages: Entry[] = allowed.map((tab) => ({ key: `tab:${tab}`, label: t(`dash.tab.${tab}` as TextKey), hint: t("dash.palette.page"), icon: tab, run: () => go(tab) }));
    const doing: Entry[] = actions.filter((action) => allowed.includes(action.tab)).map((action) => ({ key: `do:${action.intent}`, label: t(action.label), hint: t("dash.palette.action"), icon: action.tab, run: () => act(action.intent, action.tab) }));
    const locking: Entry = { key: "do:lock", label: t("dash.mfa.lockNow"), hint: t("dash.palette.action"), icon: "roles", run: lock };
    const people: Entry[] = needle.length >= 2 ? (accounts ?? []).slice(0, 6).map((row) => ({ key: `acc:${row.id}`, label: row.username, hint: t("dash.palette.account"), avatar: row.username, run: () => openAccount(row.id) })) : [];

    return [...pages, ...doing, locking].filter((entry) => !needle || entry.label.toLowerCase().includes(needle)).concat(people);
  }, [allowed, accounts, needle, t, go, act, lock, openAccount]);

  useEffect(() => setIndex(0), [needle, entries.length]);

  function choose(entry?: Entry) {
    if (!entry) return;

    onClose();
    entry.run();
  }

  return createPortal(
    <div data-layer className="dash dash-layer fixed inset-0 z-[80] flex items-start justify-center p-3 pt-[12dvh]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={t("dash.palette.title")} className="dash-dialog flex max-h-[70dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-(--border-panel) bg-(--background-surface) shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)]">
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls="dash-palette-list"
          aria-activedescendant={entries[index] ? `dash-palette-${index}` : undefined}
          className="w-full border-b border-(--border-surface) bg-transparent px-5 py-4 text-base outline-none placeholder:text-(--text-dark)"
          placeholder={t("dash.palette.placeholder")}
          aria-label={t("dash.palette.placeholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setIndex((value) => Math.min(entries.length - 1, value + 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)); }
            if (event.key === "Enter") { event.preventDefault(); choose(entries[index]); }
          }}
        />
        <ul id="dash-palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 && <li className="px-3 py-6 text-center text-sm text-(--text-dark)">{t("dash.palette.none")}</li>}
          {entries.map((entry, position) => (
            <li key={entry.key} id={`dash-palette-${position}`} role="option" aria-selected={position === index} ref={(node) => { if (position === index) node?.scrollIntoView({ block: "nearest" }); }} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm ${position === index ? "bg-(--background-raised) text-white" : "text-(--text-washed)"}`} onMouseMove={() => setIndex(position)} onClick={() => choose(entry)}>
              {entry.avatar ? <Avatar name={entry.avatar} size={20} /> : <DashIcon name={entry.icon ?? "overview"} className="size-[1.1rem] shrink-0 opacity-80" />}
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              <span className="text-xs text-(--text-dark)">{entry.hint}</span>
            </li>
          ))}
        </ul>
        <p className="flex gap-4 border-t border-(--border-surface) px-5 py-2 text-xs text-(--text-dark)"><span><kbd className="dash-kbd">↑</kbd> <kbd className="dash-kbd">↓</kbd> {t("dash.palette.move")}</span><span><kbd className="dash-kbd">Enter</kbd> {t("dash.palette.open")}</span><span><kbd className="dash-kbd">Esc</kbd> {t("common.close")}</span></p>
      </div>
    </div>,
    document.body,
  );
}
