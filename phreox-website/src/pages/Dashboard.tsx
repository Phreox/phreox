import { Markdown } from "@app/components/Markdown.tsx";
import { type FormEvent, Fragment, useEffect, useState } from "react";
import { call, type Me, type NewsPost, useLoad, useSession } from "../api.ts";
import { defaults, type Widget, setDashSettings, useDashSettings, widgetNames } from "../dashSettings.ts";
import { DashIcon } from "../dash/icons.tsx";
import { AccountManager } from "../dash/AccountManager.tsx";
import { Creator } from "../dash/Creator.tsx";
import { Cluster } from "../dash/Cluster.tsx";
import { Database } from "../dash/Database.tsx";
import { Reports } from "../dash/Reports.tsx";
import { Tickets } from "../dash/Tickets.tsx";
import { Avatar, Card, Chip, Count, Heading, Pill, Th, useAction } from "../dash/ui.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

type Overview = { accounts: number; newAccounts7d: number; spaces: number; news: number; roles: number; superAdmins: number };
type Row = { id: string; username: string; createdAt: number; flags: string[]; roles: string[]; mfaEnabled: boolean; badges: string[] };
type Role = { name: string; flags: string[]; createdAt: number };
type Audit = { id: string; at: number; actor: string; action: string; detail: string };
type Catalog = { flags: string[]; categories: string[]; badges: string[] };

type System = { startedAt: number; uptimeMillis: number; java: string; os: string; processors: number; heapUsed: number; heapMax: number; accounts: number; spaces: number; spaceMembers: number; spaceMessages: number; spaceInvites: number; bots: number; badgeGrants: number; mfaAccounts: number };
type SpaceRow = { id: string; name: string; ownerId: string; owner: string; visibility: string; listed: boolean; applicationsOpen: boolean; members: number; channels: number; volt?: number; level?: number; createdAt: number; updatedAt: number };

const tabs = ["overview", "reports", "tickets", "creator", "accounts", "testers", "spaces", "roles", "news", "audit", "database", "cluster", "system", "settings"] as const;
type Queue = { reportsOpen: number; reportsReview: number; ticketsOpen: number; ticketsMine: number; reportsMine: number; decorationsPending?: number };
type Standing = { accountId: string; status: "" | "suspended" | "banned"; warnings: number };
type Tab = (typeof tabs)[number];

// ---- second factor -------------------------------------------------------------------------------------------------

function Setup({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [setup, setSetup] = useState<{ secret: string; uri: string }>();
  const [code, setCode] = useState("");
  const { error, run } = useAction();

  return (
    <Card className="max-w-lg mx-auto">
      <h2 className="text-xl font-semibold">{t("dash.mfa.setupTitle")}</h2>
      <p className="mt-2 text-sm text-(--text-washed)">{t("dash.mfa.setupText")}</p>

      {!setup
        ? <button type="button" className="btn btn-primary mt-6 cursor-pointer" onClick={() => void run(async () => setSetup(await call("POST", "/admin/mfa/setup")))}>{t("dash.mfa.create")}</button>
        : (
          <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void run(async () => { await call("POST", "/admin/mfa/enable", { code }); onDone(); }); }}>
            <div>
              <p className="text-xs text-(--text-dark)">{t("dash.mfa.secret")}</p>
              <code className="mt-1 block select-all break-all rounded-xl bg-black/40 px-3 py-2 text-lg tracking-widest">{setup.secret}</code>
            </div>
            <a className="text-xs text-(--accent) hover:underline break-all" href={setup.uri}>{t("dash.mfa.uri")}</a>
            <label className="flex flex-col gap-1.5 text-sm">{t("dash.mfa.confirm")}
              <input className="field text-center text-xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
            </label>
            <button type="submit" disabled={code.length !== 6} className="btn btn-primary cursor-pointer disabled:opacity-50">{t("dash.mfa.enable")}</button>
          </form>
        )}

      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </Card>
  );
}

function Verify({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [code, setCode] = useState("");
  const { error, run } = useAction();

  return (
    <Card className="max-w-md mx-auto">
      <h2 className="text-xl font-semibold">{t("dash.mfa.verifyTitle")}</h2>
      <p className="mt-2 text-sm text-(--text-washed)">{t("dash.mfa.verifyText")}</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(async () => { await call("POST", "/admin/mfa/verify", { code }); onDone(); }); }}>
        <input autoFocus className="field text-center text-2xl tracking-[0.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
        <button type="submit" disabled={code.length !== 6} className="btn btn-primary cursor-pointer disabled:opacity-50">{t("dash.mfa.verify")}</button>
      </form>

      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
    </Card>
  );
}

// ---- helpers -------------------------------------------------------------------------------------------------------

/** A number that goes up every few seconds when the settings ask for automatic reloads; the lists load again with it. */
function useRefresh() {
  const { refresh } = useDashSettings();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (refresh === 0) return;

    const timer = window.setInterval(() => setTick((count) => count + 1), refresh * 1000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  return tick;
}

function duration(millis: number, lang: string) {
  const minutes = Math.floor(millis / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const unit = lang === "de" ? ["T", "Std", "Min"] : ["d", "h", "min"];

  return days > 0 ? `${days} ${unit[0]} ${hours} ${unit[1]}` : hours > 0 ? `${hours} ${unit[1]} ${minutes % 60} ${unit[2]}` : `${minutes} ${unit[2]}`;
}

function megabytes(bytes: number) {
  return `${Math.round(bytes / 1_048_576)} MB`;
}



function useRow() {
  const { density } = useDashSettings();

  return density === "compact" ? "px-3 py-1 text-sm" : "px-3 py-2.5";
}

// ---- sections ------------------------------------------------------------------------------------------------------

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-black/25 px-4 py-3">
      <p className="text-xs text-(--text-washed)">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight gradient-text">{value ?? "–"}</p>
      {hint && <p className="mt-0.5 text-xs text-(--text-dark)">{hint}</p>}
    </div>
  );
}

function StatsWidget({ tick }: { tick: number }) {
  const { t } = useT();
  const overview = useLoad(() => call<Overview>("GET", "/admin/overview"), [tick]).value;
  const system = useLoad(() => call<System>("GET", "/admin/system"), [tick]).value;
  const share = system && system.accounts > 0 ? `${Math.round((system.mfaAccounts / system.accounts) * 100)} %` : undefined;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      <Stat label={t("dash.ov.accounts")} value={overview?.accounts} />
      <Stat label={t("dash.ov.new")} value={overview?.newAccounts7d} />
      <Stat label={t("dash.ov.spaces")} value={overview?.spaces} />
      <Stat label={t("dash.ov.members")} value={system?.spaceMembers} />
      <Stat label={t("dash.ov.messages")} value={system?.spaceMessages} />
      <Stat label={t("dash.ov.mfa")} value={share} hint={system ? `${system.mfaAccounts} / ${system.accounts}` : undefined} />
      <Stat label={t("dash.ov.news")} value={overview?.news} />
      <Stat label={t("dash.ov.roles")} value={overview?.roles} />
      <Stat label={t("dash.ov.supers")} value={overview?.superAdmins} />
      <Stat label={t("dash.ov.bots")} value={system?.bots} />
      <Stat label={t("dash.ov.invites")} value={system?.spaceInvites} />
      <Stat label={t("dash.ov.badges")} value={system?.badgeGrants} />
    </div>
  );
}

function SystemTable({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<System>("GET", "/admin/system"), [tick]);

  if (!value) return <p className="text-(--text-washed)">{t("common.loading")}</p>;

  const rows: [string, string][] = [
    [t("dash.sys.up"), duration(value.uptimeMillis, lang)],
    [t("dash.sys.started"), new Date(value.startedAt).toLocaleString(lang)],
    [t("dash.sys.java"), value.java],
    [t("dash.sys.os"), value.os],
    [t("dash.sys.cpus"), String(value.processors)],
    [t("dash.sys.heap"), `${megabytes(value.heapUsed)} / ${megabytes(value.heapMax)}`],
  ];
  const used = Math.min(100, Math.round((value.heapUsed / Math.max(1, value.heapMax)) * 100));

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([name, text]) => <div key={name} className="contents"><dt className="text-(--text-dark)">{name}</dt><dd className="text-right font-mono">{text}</dd></div>)}
      </dl>
      <div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-(--brand)" style={{ width: `${used}%` }} /></div>
    </div>
  );
}

function AccountsWidget({ tick, onMore }: { tick: number; onMore: () => void }) {
  const { t, lang } = useT();
  const { ids } = useDashSettings();
  const { value } = useLoad(() => call<Row[]>("GET", "/admin/accounts?query="), [tick]);

  return (
    <Card>
      <Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={onMore}>{t("dash.tab.accounts")} →</button>}>{t("dash.w.accounts")}</Heading>
      <ul className="flex flex-col divide-y divide-white/6">
        {value?.slice(0, 8).map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="font-semibold">{row.username}</span>
            {row.flags.map((flag) => <span key={flag} className="rounded-full bg-(--brand)/25 px-2 py-0.5 text-[0.7rem] font-semibold">{t(`flag.${flag}` as TextKey)}</span>)}
            {ids && <span className="font-mono text-xs text-(--text-dark)">{row.id.slice(0, 8)}</span>}
            <span className="ml-auto text-xs text-(--text-dark)">{new Date(row.createdAt).toLocaleDateString(lang)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function SpacesWidget({ tick, onMore }: { tick: number; onMore: () => void }) {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<SpaceRow[]>("GET", "/admin/spaces"), [tick]);

  return (
    <Card>
      <Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={onMore}>{t("dash.tab.spaces")} →</button>}>{t("dash.w.spaces")}</Heading>
      {value?.length === 0 && <p className="text-sm text-(--text-washed)">{t("dash.sp.none")}</p>}
      <ul className="flex flex-col divide-y divide-white/6">
        {value?.slice(0, 8).map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="font-semibold">{row.name}</span>
            <span className="text-xs text-(--text-dark)">{row.owner}</span>
            <span className="text-xs text-(--text-washed)">{row.members} {t("dash.sp.members")}</span>
            <span className="ml-auto text-xs text-(--text-dark)">{new Date(row.createdAt).toLocaleDateString(lang)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AuditWidget({ tick, onMore }: { tick: number; onMore: () => void }) {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<Audit[]>("GET", "/admin/audit"), [tick]);

  return (
    <Card>
      <Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={onMore}>{t("dash.tab.audit")} →</button>}>{t("dash.w.audit")}</Heading>
      {value?.length === 0 && <p className="text-sm text-(--text-washed)">{t("dash.audit.none")}</p>}
      <ul className="flex flex-col divide-y divide-white/6">
        {value?.slice(0, 8).map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
            <span className="font-semibold">{row.actor}</span>
            <span className="font-mono text-xs text-(--accent)">{row.action}</span>
            <span className="min-w-0 truncate text-xs text-(--text-washed)">{row.detail}</span>
            <span className="ml-auto text-xs text-(--text-dark)">{new Date(row.at).toLocaleString(lang)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewsWidget({ tick, onMore }: { tick: number; onMore: () => void }) {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<NewsPost[]>("GET", "/news"), [tick]);

  return (
    <Card>
      <Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={onMore}>{t("dash.tab.news")} →</button>}>{t("dash.w.news")}</Heading>
      <ul className="flex flex-col divide-y divide-white/6">
        {value?.slice(0, 6).map((post) => (
          <li key={post.id} className="flex items-baseline gap-3 py-2 text-sm">
            <span className="text-xs text-(--text-dark)">{t(`cat.${post.category}` as TextKey)}</span>
            <span className="min-w-0 truncate font-semibold">{post.pinned ? "📌 " : ""}{post.title}</span>
            <span className="ml-auto shrink-0 text-xs text-(--text-dark)">{new Date(post.createdAt).toLocaleDateString(lang)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RolesWidget({ tick, onMore }: { tick: number; onMore: () => void }) {
  const { t } = useT();
  const { value } = useLoad(() => call<Role[]>("GET", "/admin/roles"), [tick]);

  return (
    <Card>
      <Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={onMore}>{t("dash.tab.roles")} →</button>}>{t("dash.w.roles")}</Heading>
      {value?.length === 0 && <p className="text-sm text-(--text-washed)">{t("dash.roles.none")}</p>}
      <ul className="flex flex-col divide-y divide-white/6">
        {value?.map((role) => (
          <li key={role.name} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="font-semibold">{role.name}</span>
            {role.flags.map((flag) => <span key={flag} className="rounded-full bg-white/8 px-2 py-0.5 text-[0.7rem]">{t(`flag.${flag}` as TextKey)}</span>)}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QueueWidget({ queue, go }: { queue?: Queue; go: (tab: Tab) => void }) {
  const { t } = useT();
  const rows: [string, number | undefined, Tab][] = [
    [t("dash.ov.reportsOpen"), queue ? queue.reportsOpen + queue.reportsReview : undefined, "reports"],
    [t("dash.ov.ticketsOpen"), queue?.ticketsOpen, "tickets"],
    [t("dash.ov.decorations"), queue?.decorationsPending, "creator"],
    [t("dash.ov.mineWork"), queue ? queue.reportsMine + queue.ticketsMine : undefined, "tickets"],
  ];

  return (
    <Card>
      <Heading>{t("dash.ov.queue")}</Heading>
      <ul className="flex flex-col divide-y divide-(--border-surface)">
        {rows.map(([label, number, tab]) => (
          <li key={label}><button type="button" className="flex w-full cursor-pointer items-center justify-between py-2.5 text-sm hover:text-white" onClick={() => go(tab)}><span className="text-(--text-washed)">{label}</span><span className={`text-2xl font-extrabold ${number ? "text-(--volt)" : "text-(--text-dark)"}`}>{number ?? "–"}</span></button></li>
        ))}
      </ul>
    </Card>
  );
}

function OverviewTab({ tick, go, queue }: { tick: number; go: (tab: Tab) => void; queue?: Queue }) {
  const { t } = useT();
  const { widgets } = useDashSettings();

  return (
    <div className="flex flex-col gap-5">
      {widgets.stats && <div><Heading>{t("dash.w.stats")}</Heading><StatsWidget tick={tick} /></div>}

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {widgets.queue && <QueueWidget queue={queue} go={go} />}
        {widgets.accounts && <AccountsWidget tick={tick} onMore={() => go("accounts")} />}
        {widgets.spaces && <SpacesWidget tick={tick} onMore={() => go("spaces")} />}
        {widgets.audit && <AuditWidget tick={tick} onMore={() => go("audit")} />}
        {widgets.news && <NewsWidget tick={tick} onMore={() => go("news")} />}
        {widgets.roles && <RolesWidget tick={tick} onMore={() => go("roles")} />}
        {widgets.system && <Card><Heading action={<button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={() => go("system")}>{t("dash.tab.system")} →</button>}>{t("dash.w.system")}</Heading><SystemTable tick={tick} /></Card>}
      </div>
    </div>
  );
}

function AccountsTab({ me, tick }: { me: Me; tick: number }) {
  const { t, lang } = useT();
  const { ids, sort } = useDashSettings();
  const cell = useRow();
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState("");
  const [manage, setManage] = useState<string>();
  const standings = useLoad(() => call<Standing[]>("GET", "/admin/support/standings"), [tick]);
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const roles = useLoad(() => call<Role[]>("GET", "/admin/roles"));
  const rows = useLoad(() => call<Row[]>("GET", `/admin/accounts?query=${encodeURIComponent(query)}`), [query, tick]);
  const { error, run } = useAction();

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  const shown = (rows.value ?? [])
    .filter((row) => !only || row.flags.includes(only))
    .sort((a, b) => sort === "name" ? a.username.localeCompare(b.username) : b.createdAt - a.createdAt);
  const badges = catalog.value?.badges ?? [];
  const standingOf = (id: string) => standings.value?.find((entry) => entry.accountId === id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input className="field max-w-sm" placeholder={t("dash.acc.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="field w-auto" aria-label={t("dash.acc.filter")} value={only} onChange={(event) => setOnly(event.target.value)}>
          <option value="">{t("dash.acc.filter")}: {t("dash.acc.all")}</option>
          {catalog.value?.flags.map((flag) => <option key={flag} value={flag}>{t(`flag.${flag}` as TextKey)}</option>)}
        </select>
        <span className="text-sm text-(--text-dark)">{t("dash.acc.count", { n: shown.length })}</span>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {rows.value?.length === 0 && <p className="text-(--text-washed)">{t("dash.acc.none")}</p>}

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[60rem] text-sm">
          <thead className="border-b border-white/8">
            <tr><Th>{t("dash.acc.username")}</Th><Th>{t("dash.acc.created")}</Th><Th>{t("dash.acc.mfa")}</Th><Th>{t("dash.acc.flags")}</Th><Th>{t("dash.acc.roles")}</Th>{badges.length > 0 && <Th>{t("dash.acc.badges")}</Th>}<Th>{t("dash.acct.manage")}</Th></tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <Fragment key={row.id}>
              <tr className="border-b border-white/5 align-top last:border-0">
                <td className={cell}>
                  <p className="flex items-center gap-2 font-semibold"><Avatar name={row.username} size={22} />{row.username}{row.id === me.id && <span className="ml-2 text-xs text-(--accent)">(du)</span>}{standingOf(row.id)?.status === "banned" && <Pill tone="red">{t("dash.mod.banned")}</Pill>}{standingOf(row.id)?.status === "suspended" && <Pill tone="red">{t("dash.mod.suspended")}</Pill>}{(standingOf(row.id)?.warnings ?? 0) > 0 && <Pill tone="orange">{t("dash.mod.warnings", { n: standingOf(row.id)?.warnings ?? 0 })}</Pill>}</p>
                  {ids && <p className="font-mono text-xs text-(--text-dark)">{row.id}</p>}
                </td>
                <td className={`${cell} whitespace-nowrap text-(--text-washed)`}>{new Date(row.createdAt).toLocaleDateString(lang)}</td>
                <td className={cell}>{row.mfaEnabled ? "✓" : "–"}</td>
                <td className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    {catalog.value?.flags.map((flag) => (
                      <Chip key={flag} on={row.flags.includes(flag)} onClick={() => void run(async () => { await call("PUT", `/admin/accounts/${row.id}/flags`, { names: toggle(row.flags, flag) }); rows.reload(); })}>{t(`flag.${flag}` as TextKey)}</Chip>
                    ))}
                  </div>
                </td>
                <td className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    {roles.value?.map((role) => (
                      <Chip key={role.name} on={row.roles.includes(role.name)} onClick={() => void run(async () => { await call("PUT", `/admin/accounts/${row.id}/roles`, { names: toggle(row.roles, role.name) }); rows.reload(); })}>{role.name}</Chip>
                    ))}
                    {roles.value?.length === 0 && <span className="text-xs text-(--text-dark)">{t("dash.roles.none")}</span>}
                  </div>
                </td>
                {/* An older service does not know the badges of the team yet: then there is nothing to show. */}
                {badges.length > 0 && <td className={cell}>
                  <div className="flex flex-wrap gap-1.5">
                    {badges.map((badge) => (
                      <Chip key={badge} on={(row.badges ?? []).includes(badge)} onClick={() => void run(async () => { await call((row.badges ?? []).includes(badge) ? "DELETE" : "PUT", `/admin/accounts/${row.id}/badges/${badge}`); rows.reload(); })}>{t(`badge.${badge}` as TextKey)}</Chip>
                    ))}
                  </div>
                </td>}
                <td className={cell}><button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={() => setManage(manage === row.id ? undefined : row.id)}>{manage === row.id ? t("common.cancel") : t("dash.acct.manage")}</button></td>
              </tr>
              {manage === row.id && <tr className="border-b border-white/5"><td colSpan={badges.length > 0 ? 7 : 6} className="bg-(--background-panel) px-4 py-4"><AccountManager accountId={row.id} me={me} /></td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpacesTab({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const { ids } = useDashSettings();
  const cell = useRow();
  const [query, setQuery] = useState("");
  const { value } = useLoad(() => call<SpaceRow[]>("GET", "/admin/spaces"), [tick]);
  const needle = query.trim().toLowerCase();
  const shown = (value ?? []).filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.owner.toLowerCase().includes(needle) || row.id.startsWith(needle));

  return (
    <div className="flex flex-col gap-4">
      <input className="field max-w-sm" placeholder={t("dash.sp.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
      {value?.length === 0 && <p className="text-(--text-washed)">{t("dash.sp.none")}</p>}

      <div className="glass overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b border-white/8">
            <tr><Th>{t("dash.sp.name")}</Th><Th>{t("dash.sp.owner")}</Th><Th>{t("dash.sp.visibility")}</Th><Th>{t("dash.sp.listed")}</Th><Th>{t("dash.sp.members")}</Th><Th>{t("dash.sp.channels")}</Th><Th>Volt</Th><Th>{t("dash.acc.created")}</Th><Th>{t("dash.sp.updated")}</Th></tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0">
                <td className={cell}>
                  <p className="font-semibold">{row.name || "–"}</p>
                  {ids && <p className="font-mono text-xs text-(--text-dark)">{row.id}</p>}
                </td>
                <td className={`${cell} text-(--text-washed)`}>{row.owner || "–"}</td>
                <td className={cell}>{row.visibility === "public" ? t("dash.sp.public") : t("dash.sp.private")}{row.applicationsOpen ? ` · ${t("dash.sp.apps")}` : ""}</td>
                <td className={cell}>{row.listed ? "✓" : "–"}</td>
                <td className={cell}>{row.members}</td>
                <td className={cell}>{row.channels}</td>
                {/* An older service does not count Volt yet: then there is nothing to show. */}
                <td className={cell}>{typeof row.volt === "number" ? `${row.volt} · ${t("dash.sp.level", { n: row.level ?? 0 })}` : "–"}</td>
                <td className={`${cell} whitespace-nowrap text-(--text-washed)`}>{new Date(row.createdAt).toLocaleDateString(lang)}</td>
                <td className={`${cell} whitespace-nowrap text-(--text-washed)`}>{new Date(row.updatedAt).toLocaleString(lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolesTab({ tick }: { tick: number }) {
  const { t } = useT();
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const roles = useLoad(() => call<Role[]>("GET", "/admin/roles"), [tick]);
  const [name, setName] = useState("");
  const { error, run } = useAction();

  const save = (role: string, flags: string[]) => run(async () => { await call("PUT", `/admin/roles/${encodeURIComponent(role)}`, { flags }); roles.reload(); });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-(--text-washed)">{t("dash.roles.hint")}</p>

      <form className="flex max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); void save(name, []).then(() => setName("")); }}>
        <input className="field" placeholder={t("dash.roles.name")} value={name} maxLength={32} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
        <button type="submit" disabled={name.length < 2} className="btn btn-primary btn-small shrink-0 cursor-pointer disabled:opacity-50">{t("dash.roles.create")}</button>
      </form>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {roles.value?.length === 0 && <p className="text-(--text-washed)">{t("dash.roles.none")}</p>}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {roles.value?.map((role) => (
          <Card key={role.name} className="flex flex-wrap items-center gap-3">
            <p className="mr-2 text-lg font-semibold">{role.name}</p>
            {catalog.value?.flags.map((flag) => (
              <Chip key={flag} on={role.flags.includes(flag)} onClick={() => void save(role.name, role.flags.includes(flag) ? role.flags.filter((item) => item !== flag) : [...role.flags, flag])}>{t(`flag.${flag}` as TextKey)}</Chip>
            ))}
            <button type="button" className="ml-auto cursor-pointer text-sm text-red-400 hover:underline" onClick={() => void run(async () => { await call("DELETE", `/admin/roles/${encodeURIComponent(role.name)}`); roles.reload(); })}>{t("common.delete")}</button>
          </Card>
        ))}
      </div>
    </div>
  );
}

type RegToken = { id: string; createdBy: string; note: string; maxUses: number; uses: number; expiresAt: number; revoked: boolean; createdAt: number };
type CreatedToken = { id: string; token: string; maxUses: number; expiresAt: number; note: string };

const ttlOptions: { seconds: number; key: TextKey }[] = [
  { seconds: 0, key: "dash.tok.never" },
  { seconds: 86400, key: "dash.tok.day" },
  { seconds: 604800, key: "dash.tok.week" },
  { seconds: 2592000, key: "dash.tok.month" },
];

function TestersTab({ tick }: { tick: number }) {
  return (
    <div className="flex flex-col gap-8">
      <TokensSection tick={tick} />
      <TesterSection tick={tick} />
    </div>
  );
}

function TokensSection({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const tokens = useLoad(() => call<RegToken[]>("GET", "/admin/registration-tokens"), [tick]);
  const [maxUses, setMaxUses] = useState(1);
  const [ttl, setTtl] = useState(0);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<CreatedToken>();
  const { error, run } = useAction();

  function statusOf(token: RegToken): TextKey {
    if (token.revoked) return "dash.tok.status.revoked";
    if (token.expiresAt && Date.now() >= token.expiresAt) return "dash.tok.status.expired";
    if (token.uses >= token.maxUses) return "dash.tok.status.used";
    return "dash.tok.status.active";
  }

  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <Card className="flex h-fit flex-col gap-4">
        <Heading>{t("dash.tok.title")}</Heading>
        <p className="text-sm text-(--text-dark)">{t("dash.tok.hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-(--text-washed)">{t("dash.tok.maxUses")}
            <input type="number" className="field" min={1} max={10000} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-(--text-washed)">{t("dash.tok.ttl")}
            <select className="field" value={ttl} onChange={(event) => setTtl(Number(event.target.value))}>
              {ttlOptions.map((option) => <option key={option.seconds} value={option.seconds}>{t(option.key)}</option>)}
            </select>
          </label>
        </div>
        <input className="field" placeholder={t("dash.tok.note")} value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="button" disabled={maxUses < 1} className="btn btn-primary btn-small cursor-pointer disabled:opacity-50" onClick={() => void run(async () => {
          const result = await call<CreatedToken>("POST", "/admin/registration-tokens", { maxUses, ttlSeconds: ttl, note });
          setCreated(result);
          setNote("");
          tokens.reload();
        })}>{t("dash.tok.create")}</button>
        {created && (
          <div className="rounded-xl border border-white/10 p-3">
            <p className="text-xs text-(--text-washed)">{t("dash.tok.created")}</p>
            <code className="mt-2 block break-all font-mono text-sm">{created.token}</code>
            <button type="button" className="btn btn-ghost btn-small mt-2 cursor-pointer" onClick={() => void navigator.clipboard.writeText(created.token)}>{t("dash.tok.copy")}</button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3 xl:col-span-2">
        {tokens.value?.length === 0 && <p className="text-(--text-washed)">{t("dash.tok.none")}</p>}
        {tokens.value?.map((token) => (
          <Card key={token.id} className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{token.note || "—"}</p>
              <p className="text-xs text-(--text-dark)">
                {new Date(token.createdAt).toLocaleString(lang)} · {t("dash.tok.uses", { used: token.uses, max: token.maxUses })} · {token.expiresAt ? new Date(token.expiresAt).toLocaleString(lang) : t("dash.tok.never")}
              </p>
            </div>
            <span className="text-sm">{t(statusOf(token))}</span>
            {!token.revoked && (
              <button type="button" className="cursor-pointer text-sm text-red-400 hover:underline" onClick={() => {
                if (confirm(t("dash.tok.confirmRevoke"))) void run(async () => {
                  await call("DELETE", `/admin/registration-tokens/${token.id}`);
                  tokens.reload();
                });
              }}>{t("dash.tok.revoke")}</button>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

function TesterSection({ tick }: { tick: number }) {
  const { t } = useT();
  const everyone = useLoad(() => call<Row[]>("GET", "/admin/accounts?query="), [tick]);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Row[]>();
  const { error, run } = useAction();
  const testers = (everyone.value ?? []).filter((row) => (row.badges ?? []).includes("tester"));

  async function search() {
    setFound(await call<Row[]>("GET", `/admin/accounts?query=${encodeURIComponent(query.trim())}`));
  }

  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <Card className="flex h-fit flex-col gap-4">
        <Heading>{t("dash.tester.title")}</Heading>
        <p className="text-sm text-(--text-dark)">{t("dash.tester.hint")}</p>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void run(search); }}>
          <input className="field" placeholder={t("dash.tester.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" className="btn btn-ghost btn-small cursor-pointer">{t("dash.tester.search")}</button>
        </form>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {found?.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3">
            <span>{row.username}</span>
            {(row.badges ?? []).includes("tester")
              ? <span className="text-xs text-(--text-dark)">{t("dash.tester.isTester")}</span>
              : <button type="button" className="btn btn-primary btn-small cursor-pointer" onClick={() => void run(async () => {
                  await call("PUT", `/admin/accounts/${row.id}/badges/tester`);
                  everyone.reload();
                  await search();
                })}>{t("dash.tester.make")}</button>}
          </div>
        ))}
      </Card>

      <Card className="flex h-fit flex-col gap-3">
        <Heading>{t("dash.tester.list")}</Heading>
        {testers.length === 0 && <p className="text-(--text-washed)">{t("dash.tester.none")}</p>}
        {testers.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3">
            <span>{row.username}</span>
            <button type="button" className="cursor-pointer text-sm text-red-400 hover:underline" onClick={() => void run(async () => {
              await call("DELETE", `/admin/accounts/${row.id}/badges/tester`);
              everyone.reload();
            })}>{t("dash.tester.remove")}</button>
          </div>
        ))}
      </Card>
    </section>
  );
}

function NewsTab({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const posts = useLoad(() => call<NewsPost[]>("GET", "/news"), [tick]);
  const [editing, setEditing] = useState<string>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("update");
  const [pinned, setPinned] = useState(false);
  const { error, run } = useAction();

  function reset() {
    setEditing(undefined);
    setTitle("");
    setBody("");
    setCategory("update");
    setPinned(false);
  }

  function edit(post: NewsPost) {
    setEditing(post.id);
    setTitle(post.title);
    setBody(post.body);
    setCategory(post.category);
    setPinned(post.pinned);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="flex h-fit flex-col gap-4">
        <input className="field" placeholder={t("dash.news.title")} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        <textarea className="field min-h-72 font-mono text-sm" placeholder={t("dash.news.body")} value={body} maxLength={20000} onChange={(event) => setBody(event.target.value)} />

        <div className="flex flex-wrap items-center gap-3">
          <select className="field w-auto" aria-label={t("dash.news.category")} value={category} onChange={(event) => setCategory(event.target.value)}>
            {catalog.value?.categories.map((name) => <option key={name} value={name}>{t(`cat.${name}` as TextKey)}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-(--text-washed)"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />{t("dash.news.pinned")}</label>
        </div>

        <p className="text-xs text-(--text-dark)">{t("dash.news.sync")}</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button type="button" disabled={!title.trim() || !body.trim()} className="btn btn-primary btn-small cursor-pointer disabled:opacity-50" onClick={() => void run(async () => {
            await call(editing ? "PUT" : "POST", editing ? `/news/${editing}` : "/news", { title, body, category, pinned });
            reset();
            posts.reload();
          })}>{editing ? t("dash.news.update") : t("dash.news.publish")}</button>
          {editing && <button type="button" className="btn btn-ghost btn-small cursor-pointer" onClick={reset}>{t("common.cancel")}</button>}
        </div>
      </Card>

      <Card className="h-fit">
        <Heading>{t("dash.news.preview")}</Heading>
        {title || body
          ? <><h3 className="text-xl font-bold">{title}</h3><div className="mt-3 text-(--text-washed)"><Markdown source={body} /></div></>
          : <p className="text-sm text-(--text-dark)">–</p>}
      </Card>

      <div className="flex flex-col gap-4">
        {posts.value?.map((post) => (
          <Card key={post.id} className="flex flex-col gap-2">
            <p className="text-xs text-(--text-dark)">{t(`cat.${post.category}` as TextKey)} · {new Date(post.createdAt).toLocaleString(lang)}{post.pinned ? " · 📌" : ""}</p>
            <p className="font-semibold">{post.title}</p>
            <div className="flex gap-4 text-sm">
              <button type="button" className="cursor-pointer text-(--accent) hover:underline" onClick={() => edit(post)}>{t("common.edit")}</button>
              <button type="button" className="cursor-pointer text-red-400 hover:underline" onClick={() => { if (confirm(t("dash.news.confirmDelete"))) void run(async () => { await call("DELETE", `/news/${post.id}`); posts.reload(); }); }}>{t("common.delete")}</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AuditTab({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const cell = useRow();
  const { value } = useLoad(() => call<Audit[]>("GET", "/admin/audit"), [tick]);

  return (
    <div className="glass overflow-x-auto rounded-3xl">
      {value?.length === 0 && <p className="p-6 text-(--text-washed)">{t("dash.audit.none")}</p>}
      <table className="w-full min-w-[44rem] text-sm">
        <tbody>
          {value?.map((row) => (
            <tr key={row.id} className="border-b border-white/5 last:border-0">
              <td className={`${cell} whitespace-nowrap text-(--text-dark)`}>{new Date(row.at).toLocaleString(lang)}</td>
              <td className={`${cell} font-semibold`}>{row.actor}</td>
              <td className={`${cell} font-mono text-(--accent)`}>{row.action}</td>
              <td className={`${cell} text-(--text-washed)`}>{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SystemTab({ tick }: { tick: number }) {
  const { t } = useT();
  const { value } = useLoad(() => call<System>("GET", "/admin/system"), [tick]);
  const counts: [string, number | undefined][] = [
    [t("dash.ov.accounts"), value?.accounts], [t("dash.ov.mfa"), value?.mfaAccounts], [t("dash.ov.spaces"), value?.spaces], [t("dash.ov.members"), value?.spaceMembers],
    [t("dash.ov.messages"), value?.spaceMessages], [t("dash.ov.invites"), value?.spaceInvites], [t("dash.ov.bots"), value?.bots], [t("dash.ov.badges"), value?.badgeGrants],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card><Heading>{t("dash.w.system")}</Heading><SystemTable tick={tick} /></Card>
      <Card>
        <Heading>{t("dash.sys.data")}</Heading>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
          {counts.map(([name, number]) => <div key={name} className="contents"><dt className="text-(--text-dark)">{name}</dt><dd className="text-right font-mono">{number ?? "–"}</dd></div>)}
        </dl>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { t } = useT();
  const settings = useDashSettings();
  const widgetLabel: Record<Widget, TextKey> = { queue: "dash.ov.queue", stats: "dash.w.stats", accounts: "dash.w.accounts", spaces: "dash.w.spaces", audit: "dash.w.audit", news: "dash.w.news", system: "dash.w.system", roles: "dash.w.roles" };
  const choice = (on: boolean, label: string, onClick: () => void) => <Chip key={label} on={on} onClick={onClick}>{label}</Chip>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold">{t("dash.set.title")}</h2>
          <p className="mt-1 text-sm text-(--text-dark)">{t("dash.set.hint")}</p>
        </div>

        <div>
          <p className="mb-2 text-sm text-(--text-washed)">{t("dash.set.density")}</p>
          <div className="flex gap-2">
            {choice(settings.density === "comfortable", t("dash.set.comfortable"), () => setDashSettings({ ...settings, density: "comfortable" }))}
            {choice(settings.density === "compact", t("dash.set.compact"), () => setDashSettings({ ...settings, density: "compact" }))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-(--text-washed)">{t("dash.set.refresh")}</p>
          <div className="flex flex-wrap gap-2">
            {([0, 15, 30, 60] as const).map((seconds) => choice(settings.refresh === seconds, seconds === 0 ? t("dash.set.off") : t("dash.set.seconds", { n: seconds }), () => setDashSettings({ ...settings, refresh: seconds })))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm text-(--text-washed)">{t("dash.set.sort")}</p>
          <div className="flex gap-2">
            {choice(settings.sort === "newest", t("dash.set.newest"), () => setDashSettings({ ...settings, sort: "newest" }))}
            {choice(settings.sort === "name", t("dash.set.name"), () => setDashSettings({ ...settings, sort: "name" }))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-(--text-washed)"><input type="checkbox" checked={settings.ids} onChange={(event) => setDashSettings({ ...settings, ids: event.target.checked })} />{t("dash.set.ids")}</label>

        <button type="button" className="btn btn-ghost btn-small w-fit cursor-pointer" onClick={() => setDashSettings(defaults)}>{t("dash.set.reset")}</button>
      </Card>

      <Card>
        <h2 className="mb-3 text-xl font-semibold">{t("dash.set.widgets")}</h2>
        <div className="flex flex-wrap gap-2">
          {widgetNames.map((name) => choice(settings.widgets[name], t(widgetLabel[name]), () => setDashSettings({ ...settings, widgets: { ...settings.widgets, [name]: !settings.widgets[name] } })))}
        </div>
      </Card>
    </div>
  );
}

// ---- the page ------------------------------------------------------------------------------------------------------

const groups: { title: TextKey; tabs: Tab[] }[] = [
  { title: "dash.group.platform", tabs: ["overview"] },
  { title: "dash.group.support", tabs: ["reports", "tickets", "creator"] },
  { title: "dash.group.manage", tabs: ["accounts", "testers", "spaces", "roles", "news"] },
  { title: "dash.group.system", tabs: ["audit", "database", "cluster", "system", "settings"] },
];
const supportTabs: Tab[] = ["reports", "tickets", "creator"];

export function Dashboard() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const tick = useRefresh();
  const [queue, setQueue] = useState<Queue>();
  const [stamp, setStamp] = useState(0);
  const isSuper = me?.flags.includes("super-admin") ?? false;
  const isSupport = isSuper || (me?.flags.includes("support") ?? false);
  // The support team sees the support desk; a super admin sees everything.
  const allowed = (isSuper ? tabs : supportTabs) as readonly Tab[];
  const [tab, setTab] = useState<Tab>(() => (tabs as readonly string[]).includes(location.hash.slice(1)) ? location.hash.slice(1) as Tab : "overview");
  const current = allowed.includes(tab) ? tab : allowed[0]!;
  const unlocked = Boolean(me?.mfaEnabled && me.elevated);

  function go(next: Tab) {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
  }

  // The counts next to Reports and Support: now, every 30 seconds, and after a change.
  useEffect(() => {
    if (!unlocked || !isSupport) return;

    let live = true;
    const load = () => call<Queue>("GET", "/admin/support/queue").then((value) => live && setQueue(value)).catch(() => undefined);

    void load();

    const timer = window.setInterval(load, 30_000);

    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [unlocked, isSupport, stamp, tick]);

  // The service asks for the second factor again once the 30 minutes are over: the page shows the code field again.
  useEffect(() => {
    const relock = () => void reload();

    window.addEventListener("phreox:relock", relock);

    return () => window.removeEventListener("phreox:relock", relock);
  }, [reload]);

  if (!me || !isSupport) {
    return <section className="mx-auto max-w-xl px-4 pt-24 text-center text-(--text-washed)">{t("dash.noAccess")}</section>;
  }

  const count = (name: Tab) => name === "reports" ? (queue ? queue.reportsOpen + queue.reportsReview : 0) : name === "tickets" ? queue?.ticketsOpen ?? 0 : name === "creator" ? queue?.decorationsPending ?? 0 : 0;

  return (
    <section className="dash w-full px-3 pt-4 sm:px-4">
      <div className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 rounded-2xl border border-(--border-surface) bg-(--background-surface) p-3 lg:sticky lg:top-20 lg:h-[calc(100dvh-6.5rem)] lg:overflow-y-auto">
          <div className="flex items-center gap-3 px-2 pt-1">
            <Avatar name={me.username} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.username}</p>
              <p className="text-xs text-(--text-dark)">{isSuper ? t("flag.super-admin") : t("flag.support")}</p>
            </div>
          </div>

          {unlocked
            ? (
              <nav className="flex flex-col gap-4" aria-label="Dashboard">
                {groups.map((group, index) => {
                  const list = group.tabs.filter((name) => allowed.includes(name));

                  return list.length === 0 ? null : (
                    <div key={index} className="flex flex-col gap-0.5">
                      <p className="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-(--text-dark)">{t(group.title)}</p>
                      {list.map((name) => (
                        <button key={name} type="button" aria-current={current === name} className={`relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${current === name ? "bg-(--background-raised) font-semibold text-white" : "text-(--text-washed) hover:bg-(--background-panel) hover:text-white"}`} onClick={() => go(name)}>
                          {current === name && <span aria-hidden className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-(--brand)" />}
                          <DashIcon name={name} className="size-[1.1rem] shrink-0 opacity-80" />
                          {t(`dash.tab.${name}` as TextKey)}
                          <Count n={count(name)} />
                        </button>
                      ))}
                    </div>
                  );
                })}
              </nav>
            )
            : <p className="px-2 text-xs text-(--text-dark)">{t("dash.mfa.verifyTitle")}</p>}

          {me.elevated && (
            <div className="mt-auto flex flex-col gap-2 border-t border-(--border-surface) px-2 pt-3 text-xs text-(--text-dark)">
              <p>{t("dash.mfa.until")} {new Date(me.elevatedUntil).toLocaleTimeString(lang)}</p>
              <button type="button" className="w-fit cursor-pointer rounded-lg border border-(--border-panel) px-3 py-1 text-(--text-washed) hover:border-(--brand) hover:text-white" onClick={() => void call("POST", "/admin/mfa/lock").then(reload)}>{t("dash.mfa.lock")}</button>
            </div>
          )}
        </aside>

        <div className="min-w-0 pb-6">
          {unlocked && (
            <header className="mb-4 flex items-center gap-3">
              <DashIcon name={current} className="size-6 text-(--accent)" />
              <h1 className="text-2xl font-bold tracking-tight">{t(`dash.tab.${current}` as TextKey)}</h1>
            </header>
          )}

          {!me.mfaEnabled && <Setup onDone={() => void reload()} />}
          {me.mfaEnabled && !me.elevated && <Verify onDone={() => void reload()} />}

          {unlocked && (
            <>
              {current === "overview" && <OverviewTab tick={tick} go={go} queue={queue} />}
              {current === "reports" && <Reports me={me} tick={tick} onChange={() => setStamp((value) => value + 1)} />}
              {current === "tickets" && <Tickets me={me} tick={tick} onChange={() => setStamp((value) => value + 1)} />}
              {current === "creator" && <Creator me={me} tick={tick} onChange={() => setStamp((value) => value + 1)} />}
              {current === "accounts" && <AccountsTab me={me} tick={tick} />}
              {current === "spaces" && <SpacesTab tick={tick} />}
              {current === "roles" && <RolesTab tick={tick} />}
              {current === "news" && <NewsTab tick={tick} />}
              {current === "testers" && <TestersTab tick={tick} />}
              {current === "audit" && <AuditTab tick={tick} />}
              {current === "database" && <Database tick={tick} />}
              {current === "cluster" && <Cluster tick={tick} />}
              {current === "system" && <SystemTab tick={tick} />}
              {current === "settings" && <SettingsTab />}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
