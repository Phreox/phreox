import { Markdown } from "@app/components/Markdown.tsx";
import { type FormEvent, useEffect, useState } from "react";
import { call, type Me, type NewsPost, useLoad, useSession } from "../api.ts";
import { defaults, type Widget, setDashSettings, useDashSettings, widgetNames } from "../dashSettings.ts";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

type Overview = { accounts: number; newAccounts7d: number; spaces: number; news: number; roles: number; superAdmins: number };
type Row = { id: string; username: string; createdAt: number; flags: string[]; roles: string[]; mfaEnabled: boolean; badges: string[] };
type Role = { name: string; flags: string[]; createdAt: number };
type Audit = { id: string; at: number; actor: string; action: string; detail: string };
type Catalog = { flags: string[]; categories: string[]; badges: string[] };

type System = { startedAt: number; uptimeMillis: number; java: string; os: string; processors: number; heapUsed: number; heapMax: number; accounts: number; spaces: number; spaceMembers: number; spaceMessages: number; spaceInvites: number; bots: number; badgeGrants: number; mfaAccounts: number };
type SpaceRow = { id: string; name: string; ownerId: string; owner: string; visibility: string; listed: boolean; applicationsOpen: boolean; members: number; channels: number; createdAt: number; updatedAt: number };

const tabs = ["overview", "accounts", "spaces", "roles", "news", "audit", "system", "settings"] as const;
type Tab = (typeof tabs)[number];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass rounded-3xl p-6 ${className}`}>{children}</div>;
}

function Chip({ on, children, onClick, disabled }: { on: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default ${on ? "bg-(--brand) border-(--brand) text-white" : "border-white/12 text-(--text-washed) hover:border-white/30"}`}>
      {children}
    </button>
  );
}

function useAction() {
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

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-(--text-dark)">{children}</h2>
      {action}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-dark) ${className}`}>{children}</th>;
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

function OverviewTab({ tick, go }: { tick: number; go: (tab: Tab) => void }) {
  const { t } = useT();
  const { widgets } = useDashSettings();

  return (
    <div className="flex flex-col gap-5">
      {widgets.stats && <div><Heading>{t("dash.w.stats")}</Heading><StatsWidget tick={tick} /></div>}

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
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
            <tr><Th>{t("dash.acc.username")}</Th><Th>{t("dash.acc.created")}</Th><Th>{t("dash.acc.mfa")}</Th><Th>{t("dash.acc.flags")}</Th><Th>{t("dash.acc.roles")}</Th>{badges.length > 0 && <Th>{t("dash.acc.badges")}</Th>}</tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-white/5 align-top last:border-0">
                <td className={cell}>
                  <p className="font-semibold">{row.username}{row.id === me.id && <span className="ml-2 text-xs text-(--accent)">(du)</span>}</p>
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
              </tr>
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
            <tr><Th>{t("dash.sp.name")}</Th><Th>{t("dash.sp.owner")}</Th><Th>{t("dash.sp.visibility")}</Th><Th>{t("dash.sp.listed")}</Th><Th>{t("dash.sp.members")}</Th><Th>{t("dash.sp.channels")}</Th><Th>{t("dash.acc.created")}</Th><Th>{t("dash.sp.updated")}</Th></tr>
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
  const widgetLabel: Record<Widget, TextKey> = { stats: "dash.w.stats", accounts: "dash.w.accounts", spaces: "dash.w.spaces", audit: "dash.w.audit", news: "dash.w.news", system: "dash.w.system", roles: "dash.w.roles" };
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

const tabIcons: Record<Tab, string> = { overview: "▦", accounts: "☺", spaces: "◍", roles: "⚑", news: "✎", audit: "☰", system: "⚙", settings: "✱" };

export function Dashboard() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const [tab, setTab] = useState<Tab>(() => (tabs as readonly string[]).includes(location.hash.slice(1)) ? location.hash.slice(1) as Tab : "overview");
  const tick = useRefresh();

  function go(next: Tab) {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
  }

  // The service asks for the second factor again once the 30 minutes are over: the page shows the code field again.
  useEffect(() => {
    const relock = () => void reload();

    window.addEventListener("phreox:relock", relock);

    return () => window.removeEventListener("phreox:relock", relock);
  }, [reload]);

  if (!me?.flags.includes("super-admin")) {
    return <section className="mx-auto max-w-xl px-4 pt-24 text-center text-(--text-washed)">{t("dash.noAccess")}</section>;
  }

  const unlocked = me.mfaEnabled && me.elevated;

  return (
    <section className="w-full px-4 pt-8 sm:px-6">
      <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t("dash.title")}</h1>
          <p className="mt-1 text-sm text-(--text-dark)">{me.username}</p>
        </div>

        {me.elevated && (
          <p className="flex items-center gap-3 text-xs text-(--text-washed)">
            {t("dash.mfa.until")} {new Date(me.elevatedUntil).toLocaleTimeString(lang)}
            <button type="button" className="btn btn-ghost btn-small cursor-pointer" onClick={() => void call("POST", "/admin/mfa/lock").then(reload)}>{t("dash.mfa.lock")}</button>
          </p>
        )}
      </Reveal>

      {!me.mfaEnabled && <Setup onDone={() => void reload()} />}
      {me.mfaEnabled && !me.elevated && <Verify onDone={() => void reload()} />}

      {unlocked && (
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <nav className="flex gap-1.5 overflow-x-auto lg:sticky lg:top-24 lg:h-fit lg:flex-col lg:overflow-visible" aria-label="Dashboard">
            {tabs.map((name) => (
              <button key={name} type="button" className={`flex shrink-0 cursor-pointer items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors ${tab === name ? "bg-(--brand) text-white" : "glass text-(--text-washed) hover:text-white"}`} onClick={() => go(name)}>
                <span aria-hidden className="w-4 text-center opacity-70">{tabIcons[name]}</span>{t(`dash.tab.${name}` as TextKey)}
              </button>
            ))}
          </nav>

          <div className="min-w-0 pb-4">
            {tab === "overview" && <OverviewTab tick={tick} go={go} />}
            {tab === "accounts" && <AccountsTab me={me} tick={tick} />}
            {tab === "spaces" && <SpacesTab tick={tick} />}
            {tab === "roles" && <RolesTab tick={tick} />}
            {tab === "news" && <NewsTab tick={tick} />}
            {tab === "audit" && <AuditTab tick={tick} />}
            {tab === "system" && <SystemTab tick={tick} />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </div>
      )}
    </section>
  );
}
