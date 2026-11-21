import { useCallback, useEffect, useState } from "react";
import { call, type Me, useSession } from "../api.ts";
import { Access } from "../dash/Access.tsx";
import { AccountDrawer, Accounts } from "../dash/Accounts.tsx";
import { Audit } from "../dash/Audit.tsx";
import { Cluster } from "../dash/Cluster.tsx";
import { Creator } from "../dash/Creator.tsx";
import { Database } from "../dash/Database.tsx";
import { refreshData, useData } from "../dash/data.ts";
import { DashIcon } from "../dash/icons.tsx";
import { Setup, Verify } from "../dash/Mfa.tsx";
import { News } from "../dash/News.tsx";
import { OverlayProvider } from "../dash/overlay.tsx";
import { Overview } from "../dash/Overview.tsx";
import { Palette } from "../dash/Palette.tsx";
import { Reports } from "../dash/Reports.tsx";
import { Roles } from "../dash/Roles.tsx";
import { Settings } from "../dash/Settings.tsx";
import { Spaces } from "../dash/Spaces.tsx";
import { System } from "../dash/System.tsx";
import { Tickets } from "../dash/Tickets.tsx";
import { type ClusterStatus, hostOf, type Intent, type Queue, type Tab, tabs } from "../dash/types.ts";
import { Avatar, Count } from "../dash/ui.tsx";
import { useDashSettings } from "../dashSettings.ts";
import { type TextKey, useT } from "../i18n.ts";

const groups: { title: TextKey; tabs: Tab[] }[] = [
  { title: "dash.group.platform", tabs: ["overview"] },
  { title: "dash.group.support", tabs: ["reports", "tickets", "creator"] },
  { title: "dash.group.manage", tabs: ["accounts", "testers", "spaces", "roles", "news"] },
  { title: "dash.group.system", tabs: ["audit", "database", "cluster", "system", "settings"] },
];
const supportTabs: Tab[] = ["reports", "tickets", "creator"];

/** A number that goes up every few seconds when the settings ask for automatic reloads, and when somebody asks for a reload. */
function useRefresh() {
  const { refresh } = useDashSettings();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (refresh === 0) return;

    const timer = window.setInterval(() => setTick((count) => count + 1), refresh * 1000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  return [tick, () => setTick((count) => count + 1)] as const;
}

/** How long the second factor still holds, and the button that ends it now. When the time is over the page asks for the code again. */
function SessionLine({ me, reload }: { me: Me; reload: () => Promise<void> }) {
  const { t } = useT();
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, me.elevatedUntil - now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    const over = window.setTimeout(() => void reload(), Math.max(1_000, me.elevatedUntil - Date.now() + 1_000));

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(over);
    };
  }, [me.elevatedUntil, reload]);

  return (
    <div className="flex items-center gap-2 text-xs text-(--text-dark)">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${left < 120_000 ? "bg-[#ffb86b]" : "bg-[#3ecf8e]"}`} />
      <span className="min-w-0 flex-1 truncate">{t("dash.mfa.left", { n: Math.max(1, Math.ceil(left / 60_000)) })}</span>
      <button type="button" className="cursor-pointer rounded-lg border border-(--border-panel) px-2 py-1 text-(--text-washed) transition-colors hover:border-(--border-raised) hover:text-white" onClick={() => void call("POST", "/admin/mfa/lock").then(reload)}>{t("dash.mfa.lock")}</button>
    </div>
  );
}

/** The services of the cluster as dots, in the bar at the top: a look tells whether one is away. */
function ClusterDots({ tick, onOpen }: { tick: number; onOpen: () => void }) {
  const { t } = useT();
  const status = useData<ClusterStatus>("/admin/cluster", tick);
  const { reload } = status;

  useEffect(() => {
    const timer = window.setInterval(reload, 20_000);

    return () => window.clearInterval(timer);
  }, [reload]);

  if (!status.value?.enabled) return null;

  const nodes = status.value.nodes;
  const up = nodes.filter((node) => node.healthy && !node.leaving).length;

  return (
    <button type="button" title={nodes.map((node) => `${hostOf(node.url)}: ${node.leaving ? t("dash.cluster.leaving") : node.healthy ? t("dash.cluster.up") : t("dash.cluster.down")}`).join("\n")} className="flex cursor-pointer items-center gap-2 rounded-xl border border-(--border-surface) px-3 py-2 text-xs text-(--text-washed) transition-colors hover:border-(--border-raised) hover:text-white" onClick={onOpen}>
      <span aria-hidden className="flex gap-1">
        {nodes.map((node) => <span key={node.url} className={`size-2 rounded-full ${node.leaving ? "bg-[#ffb86b]" : node.healthy ? "bg-[#3ecf8e]" : "bg-[#ff7a93]"}`} />)}
      </span>
      <span className="tabular-nums">{t("dash.cluster.upOf", { up, all: nodes.length })}</span>
    </button>
  );
}

function Page({ me, reload }: { me: Me; reload: () => Promise<void> }) {
  const { t } = useT();
  const [tick, refresh] = useRefresh();
  const [queue, setQueue] = useState<Queue>();
  const [stamp, setStamp] = useState(0);
  const [intent, setIntent] = useState<Intent>();
  const [account, setAccount] = useState<string>();
  const [searching, setSearching] = useState(false);
  const isSuper = me.flags.includes("super-admin");
  // The support team sees the support desk; a super admin sees everything.
  const allowed = (isSuper ? tabs : supportTabs) as readonly Tab[];
  const [tab, setTab] = useState<Tab>(() => (tabs as readonly string[]).includes(location.hash.slice(1)) ? location.hash.slice(1) as Tab : "overview");
  const current = allowed.includes(tab) ? tab : allowed[0]!;
  const unlocked = me.mfaEnabled && me.elevated;

  const go = useCallback((next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);
  const act = useCallback((next: Intent, where: Tab) => {
    go(where);
    setIntent(next);
  }, [go]);
  const done = useCallback(() => setIntent(undefined), []);
  const changed = useCallback(() => setStamp((value) => value + 1), []);
  const lock = useCallback(() => void call("POST", "/admin/mfa/lock").then(reload), [reload]);

  // An address with another page behind the # (a link, the back button) shows that page.
  useEffect(() => {
    const follow = () => {
      const named = location.hash.slice(1);

      if ((tabs as readonly string[]).includes(named)) setTab(named as Tab);
    };

    window.addEventListener("hashchange", follow);

    return () => window.removeEventListener("hashchange", follow);
  }, []);

  // The counts next to Reports and Support: now, every 30 seconds, and after a change.
  useEffect(() => {
    if (!unlocked) return;

    let live = true;
    const load = () => call<Queue>("GET", "/admin/support/queue").then((value) => live && setQueue(value)).catch(() => undefined);

    void load();

    const timer = window.setInterval(load, 30_000);

    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [unlocked, stamp, tick]);

  // The service asks for the second factor again once its time is over: the page shows the code field again.
  useEffect(() => {
    const relock = () => void reload();

    window.addEventListener("phreox:relock", relock);

    return () => window.removeEventListener("phreox:relock", relock);
  }, [reload]);

  // Ctrl+K (⌘K) opens the search from anywhere.
  useEffect(() => {
    if (!unlocked) return;

    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearching(true);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [unlocked]);

  if (!me.mfaEnabled) return <section className="dash w-full px-3 pt-4 sm:px-4"><Setup onDone={() => void reload()} /></section>;
  if (!me.elevated) return <section className="dash w-full px-3 pt-4 sm:px-4"><Verify onDone={() => void reload()} /></section>;

  const count = (name: Tab) => name === "reports" ? (queue ? queue.reportsOpen + queue.reportsReview : 0) : name === "tickets" ? queue?.ticketsOpen ?? 0 : name === "creator" ? queue?.decorationsPending ?? 0 : 0;

  return (
    <section className="dash w-full px-3 pt-3 sm:px-4">
      <div className="grid gap-3 lg:grid-cols-[14.5rem_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]">
          <div className="hidden items-center gap-3 rounded-2xl border border-(--border-surface) bg-(--background-surface) p-3 lg:flex">
            <Avatar name={me.username} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.username}</p>
              <p className="text-xs text-(--text-dark)">{isSuper ? t("flag.super-admin") : t("flag.support")}</p>
            </div>
          </div>

          <nav aria-label="Dashboard" className="dash-rail flex gap-1 overflow-x-auto rounded-2xl border border-(--border-surface) bg-(--background-surface) p-2 lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-4 lg:overflow-x-visible lg:overflow-y-auto lg:p-3">
            {groups.map((group) => {
              const list = group.tabs.filter((name) => allowed.includes(name));

              return list.length === 0 ? null : (
                <div key={group.title} className="flex shrink-0 gap-1 lg:flex-col lg:gap-0.5">
                  <p className="hidden px-3 pb-1 text-xs text-(--text-dark) lg:block">{t(group.title)}</p>
                  {list.map((name) => (
                    <button key={name} type="button" ref={current === name ? (node) => node?.scrollIntoView({ block: "nearest", inline: "nearest" }) : undefined} aria-current={current === name ? "page" : undefined} className={`relative flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${current === name ? "bg-(--background-raised) font-semibold text-white" : "text-(--text-washed) hover:bg-(--background-panel) hover:text-white"}`} onClick={() => go(name)}>
                      {current === name && <span aria-hidden className="absolute top-2 bottom-2 left-0 hidden w-[3px] rounded-full bg-(--brand) lg:block" />}
                      <DashIcon name={name} className="size-[1.1rem] shrink-0 opacity-80" />
                      <span className="whitespace-nowrap">{t(`dash.tab.${name}` as TextKey)}</span>
                      <Count n={count(name)} tone="orange" />
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <div className="hidden rounded-2xl border border-(--border-surface) bg-(--background-surface) p-3 lg:block">
            <SessionLine me={me} reload={reload} />
          </div>
        </aside>

        <div className="dash-main min-w-0 pb-8">
          <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <h1 className="display text-[2.1rem]">{t(`dash.tab.${current}` as TextKey)}</h1>
              <p className="mt-1.5 max-w-[70ch] text-sm text-(--text-dark)">{t(`dash.desc.${current}` as TextKey)}</p>
            </div>

            {isSuper && <ClusterDots tick={tick} onOpen={() => go("cluster")} />}
            <button type="button" className="flex cursor-pointer items-center gap-2 rounded-xl border border-(--border-surface) px-3 py-2 text-xs text-(--text-washed) transition-colors hover:border-(--border-raised) hover:text-white" onClick={() => setSearching(true)}>
              <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              {t("common.search")}
              <kbd className="dash-kbd hidden sm:inline-block">Ctrl K</kbd>
            </button>
            <button type="button" aria-label={t("dash.reload")} title={t("dash.reload")} className="grid size-[2.1rem] cursor-pointer place-items-center rounded-xl border border-(--border-surface) text-(--text-washed) transition-colors hover:border-(--border-raised) hover:text-white" onClick={() => { refreshData("/"); refresh(); }}>
              <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
            </button>
            <div className="w-full lg:hidden"><SessionLine me={me} reload={reload} /></div>
          </header>

          {current === "overview" && <Overview tick={tick} go={go} queue={queue} isSuper={isSuper} openAccount={setAccount} />}
          {current === "reports" && <Reports me={me} tick={tick} onChange={changed} />}
          {current === "tickets" && <Tickets me={me} tick={tick} onChange={changed} />}
          {current === "creator" && <Creator me={me} tick={tick} onChange={changed} />}
          {current === "accounts" && <Accounts me={me} tick={tick} openAccount={setAccount} />}
          {current === "spaces" && <Spaces tick={tick} />}
          {current === "roles" && <Roles tick={tick} intent={intent} done={done} />}
          {current === "news" && <News tick={tick} intent={intent} done={done} />}
          {current === "testers" && <Access tick={tick} intent={intent} done={done} />}
          {current === "audit" && <Audit tick={tick} />}
          {current === "database" && <Database tick={tick} />}
          {current === "cluster" && <Cluster tick={tick} intent={intent} done={done} />}
          {current === "system" && <System tick={tick} />}
          {current === "settings" && <Settings />}
        </div>
      </div>

      {account && <AccountDrawer accountId={account} me={me} onClose={() => setAccount(undefined)} />}
      {searching && <Palette allowed={allowed} isSuper={isSuper} go={go} act={act} openAccount={setAccount} lock={lock} onClose={() => setSearching(false)} />}
    </section>
  );
}

export function Dashboard() {
  const { t } = useT();
  const { me, reload } = useSession();
  const isSupport = Boolean(me && (me.flags.includes("super-admin") || me.flags.includes("support")));

  if (!me || !isSupport) {
    return <section className="mx-auto max-w-xl px-4 pt-24 text-center text-(--text-washed)">{t("dash.noAccess")}</section>;
  }

  return <OverlayProvider><Page me={me} reload={reload} /></OverlayProvider>;
}
