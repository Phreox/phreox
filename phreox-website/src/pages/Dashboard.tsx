import { Markdown } from "@app/components/Markdown.tsx";
import { type FormEvent, useEffect, useState } from "react";
import { call, type Me, type NewsPost, useLoad, useSession } from "../api.ts";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

type Overview = { accounts: number; newAccounts7d: number; spaces: number; news: number; roles: number; superAdmins: number };
type Row = { id: string; username: string; createdAt: number; flags: string[]; roles: string[]; mfaEnabled: boolean; badges: string[] };
type Role = { name: string; flags: string[]; createdAt: number };
type Audit = { id: string; at: number; actor: string; action: string; detail: string };
type Catalog = { flags: string[]; categories: string[]; badges: string[] };

const tabs = ["overview", "accounts", "roles", "news", "audit"] as const;
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

// ---- sections ------------------------------------------------------------------------------------------------------

function OverviewTab() {
  const { t } = useT();
  const { value } = useLoad(() => call<Overview>("GET", "/admin/overview"));
  const items: [TextKey, number | undefined][] = [
    ["dash.ov.accounts", value?.accounts], ["dash.ov.new", value?.newAccounts7d], ["dash.ov.spaces", value?.spaces],
    ["dash.ov.news", value?.news], ["dash.ov.roles", value?.roles], ["dash.ov.supers", value?.superAdmins],
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(([key, number]) => (
        <Card key={key}>
          <p className="text-sm text-(--text-washed)">{t(key)}</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight gradient-text">{number ?? "–"}</p>
        </Card>
      ))}
    </div>
  );
}

function AccountsTab({ me }: { me: Me }) {
  const { t, lang } = useT();
  const [query, setQuery] = useState("");
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const roles = useLoad(() => call<Role[]>("GET", "/admin/roles"));
  const rows = useLoad(() => call<Row[]>("GET", `/admin/accounts?query=${encodeURIComponent(query)}`), [query]);
  const { error, run } = useAction();

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  return (
    <div className="flex flex-col gap-4">
      <input className="field max-w-sm" placeholder={t("dash.acc.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {rows.value?.length === 0 && <p className="text-(--text-washed)">{t("dash.acc.none")}</p>}

      {rows.value?.map((row) => (
        <Card key={row.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="font-semibold text-lg">{row.username}{row.id === me.id && <span className="ml-2 text-xs text-(--accent)">(du)</span>}</p>
            <p className="text-xs text-(--text-dark)">{t("dash.acc.created")} {new Date(row.createdAt).toLocaleDateString(lang)}</p>
            <p className="text-xs text-(--text-dark)">{t("dash.acc.mfa")} {row.mfaEnabled ? "✓" : "–"}</p>
            <p className="text-xs text-(--text-dark) font-mono ml-auto">{row.id}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-(--text-dark) w-14">{t("dash.acc.flags")}</span>
            {catalog.value?.flags.map((flag) => (
              <Chip key={flag} on={row.flags.includes(flag)} onClick={() => void run(async () => { await call("PUT", `/admin/accounts/${row.id}/flags`, { names: toggle(row.flags, flag) }); rows.reload(); })}>
                {t(`flag.${flag}` as TextKey)}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-(--text-dark) w-14">{t("dash.acc.roles")}</span>
            {roles.value?.map((role) => (
              <Chip key={role.name} on={row.roles.includes(role.name)} onClick={() => void run(async () => { await call("PUT", `/admin/accounts/${row.id}/roles`, { names: toggle(row.roles, role.name) }); rows.reload(); })}>
                {role.name}
              </Chip>
            ))}
            {roles.value?.length === 0 && <span className="text-xs text-(--text-dark)">{t("dash.roles.none")}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-14 text-xs text-(--text-dark)">{t("dash.acc.badges")}</span>
            {catalog.value?.badges.map((badge) => (
              <Chip key={badge} on={row.badges.includes(badge)} onClick={() => void run(async () => { await call(row.badges.includes(badge) ? "DELETE" : "PUT", `/admin/accounts/${row.id}/badges/${badge}`); rows.reload(); })}>
                {t(`badge.${badge}` as TextKey)}
              </Chip>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function RolesTab() {
  const { t } = useT();
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const roles = useLoad(() => call<Role[]>("GET", "/admin/roles"));
  const [name, setName] = useState("");
  const { error, run } = useAction();

  const save = (role: string, flags: string[]) => run(async () => { await call("PUT", `/admin/roles/${encodeURIComponent(role)}`, { flags }); roles.reload(); });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-(--text-washed)">{t("dash.roles.hint")}</p>

      <form className="flex gap-2 max-w-md" onSubmit={(event) => { event.preventDefault(); void save(name, []).then(() => setName("")); }}>
        <input className="field" placeholder={t("dash.roles.name")} value={name} maxLength={32} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
        <button type="submit" disabled={name.length < 2} className="btn btn-primary btn-small shrink-0 cursor-pointer disabled:opacity-50">{t("dash.roles.create")}</button>
      </form>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {roles.value?.length === 0 && <p className="text-(--text-washed)">{t("dash.roles.none")}</p>}

      {roles.value?.map((role) => (
        <Card key={role.name} className="flex flex-wrap items-center gap-3">
          <p className="font-semibold text-lg mr-2">{role.name}</p>
          {catalog.value?.flags.map((flag) => (
            <Chip key={flag} on={role.flags.includes(flag)} onClick={() => void save(role.name, role.flags.includes(flag) ? role.flags.filter((item) => item !== flag) : [...role.flags, flag])}>{t(`flag.${flag}` as TextKey)}</Chip>
          ))}
          <button type="button" className="ml-auto text-sm text-red-400 hover:underline cursor-pointer" onClick={() => void run(async () => { await call("DELETE", `/admin/roles/${encodeURIComponent(role.name)}`); roles.reload(); })}>{t("common.delete")}</button>
        </Card>
      ))}
    </div>
  );
}

function NewsTab() {
  const { t, lang } = useT();
  const catalog = useLoad(() => call<Catalog>("GET", "/admin/catalog"));
  const posts = useLoad(() => call<NewsPost[]>("GET", "/news"));
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
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="flex flex-col gap-4 h-fit">
        <input className="field" placeholder={t("dash.news.title")} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
        <textarea className="field min-h-56 font-mono text-sm" placeholder={t("dash.news.body")} value={body} maxLength={20000} onChange={(event) => setBody(event.target.value)} />

        <div className="flex flex-wrap items-center gap-3">
          <select className="field w-auto" aria-label={t("dash.news.category")} value={category} onChange={(event) => setCategory(event.target.value)}>
            {catalog.value?.categories.map((name) => <option key={name} value={name}>{t(`cat.${name}` as TextKey)}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-(--text-washed) cursor-pointer"><input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />{t("dash.news.pinned")}</label>
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

      <div className="flex flex-col gap-4">
        {(title || body) && (
          <Card>
            <p className="text-xs uppercase tracking-wider text-(--text-dark)">{t("dash.news.preview")}</p>
            <h3 className="mt-2 text-xl font-bold">{title}</h3>
            <div className="mt-3 text-(--text-washed)"><Markdown source={body} /></div>
          </Card>
        )}

        {posts.value?.map((post) => (
          <Card key={post.id} className="flex flex-col gap-2">
            <p className="text-xs text-(--text-dark)">{t(`cat.${post.category}` as TextKey)} · {new Date(post.createdAt).toLocaleString(lang)}{post.pinned ? " · 📌" : ""}</p>
            <p className="font-semibold">{post.title}</p>
            <div className="flex gap-4 text-sm">
              <button type="button" className="text-(--accent) hover:underline cursor-pointer" onClick={() => edit(post)}>{t("common.edit")}</button>
              <button type="button" className="text-red-400 hover:underline cursor-pointer" onClick={() => { if (confirm(t("dash.news.confirmDelete"))) void run(async () => { await call("DELETE", `/news/${post.id}`); posts.reload(); }); }}>{t("common.delete")}</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AuditTab() {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<Audit[]>("GET", "/admin/audit"));

  return (
    <Card className="overflow-x-auto">
      {value?.length === 0 && <p className="text-(--text-washed)">{t("dash.audit.none")}</p>}
      <table className="w-full text-sm">
        <tbody>
          {value?.map((row) => (
            <tr key={row.id} className="border-b border-white/5 last:border-0">
              <td className="py-2 pr-4 text-(--text-dark) whitespace-nowrap">{new Date(row.at).toLocaleString(lang)}</td>
              <td className="py-2 pr-4 font-semibold">{row.actor}</td>
              <td className="py-2 pr-4 font-mono text-(--accent)">{row.action}</td>
              <td className="py-2 text-(--text-washed)">{row.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ---- the page ------------------------------------------------------------------------------------------------------

export function Dashboard() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const [tab, setTab] = useState<Tab>("overview");

  // The service asks for the second factor again once the 30 minutes are over: the page shows the code field again.
  useEffect(() => {
    const relock = () => void reload();

    window.addEventListener("phreox:relock", relock);

    return () => window.removeEventListener("phreox:relock", relock);
  }, [reload]);

  if (!me?.flags.includes("super-admin")) {
    return <section className="mx-auto max-w-xl px-4 pt-24 text-center text-(--text-washed)">{t("dash.noAccess")}</section>;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">{t("dash.title")}</h1>
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

      {me.mfaEnabled && me.elevated && (
        <>
          <div className="mb-6 flex flex-wrap gap-1.5">
            {tabs.map((name) => (
              <button key={name} type="button" className={`px-4 py-2 rounded-full text-sm font-semibold cursor-pointer transition-colors ${tab === name ? "bg-(--brand) text-white" : "glass text-(--text-washed) hover:text-white"}`} onClick={() => setTab(name)}>{t(`dash.tab.${name}` as TextKey)}</button>
            ))}
          </div>

          <>
            {tab === "overview" && <OverviewTab />}
            {tab === "accounts" && <AccountsTab me={me} />}
            {tab === "roles" && <RolesTab />}
            {tab === "news" && <NewsTab />}
            {tab === "audit" && <AuditTab />}
          </>
        </>
      )}
    </section>
  );
}
