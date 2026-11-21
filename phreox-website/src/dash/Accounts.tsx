import { useEffect, useState } from "react";
import { call, type Me } from "../api.ts";
import { useDashSettings } from "../dashSettings.ts";
import { type TextKey, useT } from "../i18n.ts";
import { AccountManager } from "./AccountManager.tsx";
import { refreshData, useData } from "./data.ts";
import { Drawer, useRun } from "./overlay.tsx";
import type { Catalog, Role, Row, Standing } from "./types.ts";
import { Avatar, Chip, CopyButton, Empty, ErrorLine, Pill, SearchField, Skeleton, TableShell, Th } from "./ui.tsx";

function toggled(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function StandingPills({ standing }: { standing?: Standing }) {
  const { t } = useT();

  return (
    <>
      {standing?.status === "banned" && <Pill tone="red">{t("dash.mod.banned")}</Pill>}
      {standing?.status === "suspended" && <Pill tone="red">{t("dash.mod.suspended")}</Pill>}
      {(standing?.warnings ?? 0) > 0 && <Pill tone="orange">{t("dash.mod.warnings", { n: standing?.warnings ?? 0 })}</Pill>}
    </>
  );
}

/** One group of switches of an account (its rights, its roles, its badges). */
function Switches({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] | undefined }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-(--text-washed)">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {children}
        {(!children || children.length === 0) && empty && <span className="text-xs text-(--text-dark)">{empty}</span>}
      </div>
    </div>
  );
}

/**
 * Everything about one account, at the side of whatever page it was opened from: what it may do, and the tools of the team
 * (warnings, suspensions, its profile, deleting it).
 */
export function AccountDrawer({ accountId, me, onClose }: { accountId: string; me: Me; onClose: () => void }) {
  const { t, lang } = useT();
  const isSuper = me.flags.includes("super-admin");
  const found = useData<Row[]>(isSuper ? `/admin/accounts?query=${encodeURIComponent(accountId)}` : null);
  const catalog = useData<Catalog>(isSuper ? "/admin/catalog" : null).value;
  const roles = useData<Role[]>(isSuper ? "/admin/roles" : null).value;
  const row = found.value?.find((entry) => entry.id === accountId);
  const { busy, run } = useRun();

  const change = (action: () => Promise<unknown>) => void run(async () => {
    await action();
    refreshData("/admin/accounts");
  });

  return (
    <Drawer
      title={row?.username ?? t("dash.acct.manage")}
      lead={<Avatar name={row?.username ?? "?"} size={40} />}
      subtitle={<span className="flex flex-wrap items-center gap-2"><span className="tabular-nums">{accountId}</span>{row && <span>{t("dash.acc.since", { date: new Date(row.createdAt).toLocaleDateString(lang) })}</span>}</span>}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        {row && catalog && (
          <section className="flex flex-col gap-4 rounded-2xl border border-(--border-surface) bg-(--background-dark) p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={row.mfaEnabled ? "green" : "grey"}>{row.mfaEnabled ? t("dash.acc.mfaOn") : t("dash.acc.mfaOff")}</Pill>
              {row.id === me.id && <Pill tone="violet">{t("dash.acc.you")}</Pill>}
              <span className="ml-auto"><CopyButton text={row.id} label={t("dash.acc.copyId")} /></span>
            </div>
            <Switches title={t("dash.acc.flags")}>
              {catalog.flags.map((flag) => <Chip key={flag} disabled={busy} on={row.flags.includes(flag)} onClick={() => change(() => call("PUT", `/admin/accounts/${row.id}/flags`, { names: toggled(row.flags, flag) }))}>{t(`flag.${flag}` as TextKey)}</Chip>)}
            </Switches>
            <Switches title={t("dash.acc.roles")} empty={t("dash.roles.none")}>
              {roles?.map((role) => <Chip key={role.name} disabled={busy} on={row.roles.includes(role.name)} onClick={() => change(() => call("PUT", `/admin/accounts/${row.id}/roles`, { names: toggled(row.roles, role.name) }))}>{role.name}</Chip>)}
            </Switches>
            {/* An older service does not know the badges of the team yet: then there is nothing to show. */}
            {catalog.badges?.length > 0 && (
              <Switches title={t("dash.acc.badges")}>
                {catalog.badges.map((badge) => <Chip key={badge} disabled={busy} on={(row.badges ?? []).includes(badge)} onClick={() => change(() => call((row.badges ?? []).includes(badge) ? "DELETE" : "PUT", `/admin/accounts/${row.id}/badges/${badge}`))}>{t(`badge.${badge}` as TextKey)}</Chip>)}
              </Switches>
            )}
          </section>
        )}

        <AccountManager bare={Boolean(row)} accountId={accountId} me={me} onDeleted={() => { refreshData("/admin/accounts"); onClose(); }} />
      </div>
    </Drawer>
  );
}

/** Every account, to search and filter; a row opens the account at the side. */
export function Accounts({ me, tick, openAccount }: { me: Me; tick: number; openAccount: (id: string) => void }) {
  const { t, lang } = useT();
  const { ids, sort, density } = useDashSettings();
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState("");
  const standings = useData<Standing[]>("/admin/support/standings", tick).value;
  const catalog = useData<Catalog>("/admin/catalog").value;
  const rows = useData<Row[]>(`/admin/accounts?query=${encodeURIComponent(query)}`, tick);
  const cell = density === "compact" ? "px-4 py-1.5" : "px-4 py-3";

  // The service is asked once the typing pauses, not with every letter.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(typed.trim()), 220);

    return () => window.clearTimeout(timer);
  }, [typed]);

  const shown = (rows.value ?? [])
    .filter((row) => !only || row.flags.includes(only))
    .sort((a, b) => sort === "name" ? a.username.localeCompare(b.username) : b.createdAt - a.createdAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField className="w-full max-w-sm" placeholder={t("dash.acc.search")} value={typed} onChange={setTyped} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("dash.acc.filter")}>
          <Chip on={only === ""} onClick={() => setOnly("")}>{t("dash.acc.all")}</Chip>
          {catalog?.flags.map((flag) => <Chip key={flag} on={only === flag} onClick={() => setOnly(only === flag ? "" : flag)}>{t(`flag.${flag}` as TextKey)}</Chip>)}
        </div>
        <span className="ml-auto text-sm tabular-nums text-(--text-dark)">{t("dash.acc.count", { n: shown.length })}</span>
      </div>

      <ErrorLine error={rows.error} />
      {rows.loading && <Skeleton rows={5} />}
      {rows.value && shown.length === 0 && <Empty>{t("dash.acc.none")}</Empty>}

      {shown.length > 0 && (
        <TableShell minWidth="46rem">
          <thead>
            <tr><Th>{t("dash.acc.username")}</Th><Th>{t("dash.acc.flags")}</Th><Th>{t("dash.acc.roles")}</Th><Th>{t("dash.acc.badges")}</Th><Th>{t("dash.acc.mfa")}</Th><Th className="text-right">{t("dash.acc.created")}</Th></tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const standing = standings?.find((entry) => entry.accountId === row.id);

              return (
                <tr key={row.id} className="cursor-pointer" onClick={() => openAccount(row.id)}>
                  <td className={cell}>
                    <button type="button" className="flex cursor-pointer items-center gap-2.5 text-left font-medium" onClick={(event) => { event.stopPropagation(); openAccount(row.id); }}>
                      <Avatar name={row.username} size={26} />
                      <span>
                        <span className="flex flex-wrap items-center gap-1.5">{row.username}{row.id === me.id && <Pill tone="violet">{t("dash.acc.you")}</Pill>}<StandingPills standing={standing} /></span>
                        {ids && <span className="block text-xs font-normal tabular-nums text-(--text-dark)">{row.id}</span>}
                      </span>
                    </button>
                  </td>
                  <td className={cell}><div className="flex flex-wrap gap-1">{row.flags.map((flag) => <Pill key={flag} tone="violet">{t(`flag.${flag}` as TextKey)}</Pill>)}{row.flags.length === 0 && <span className="text-(--text-dark)">–</span>}</div></td>
                  <td className={cell}><div className="flex flex-wrap gap-1">{row.roles.map((role) => <Pill key={role}>{role}</Pill>)}{row.roles.length === 0 && <span className="text-(--text-dark)">–</span>}</div></td>
                  <td className={cell}><div className="flex flex-wrap gap-1">{(row.badges ?? []).map((badge) => <Pill key={badge}>{t(`badge.${badge}` as TextKey)}</Pill>)}{(row.badges ?? []).length === 0 && <span className="text-(--text-dark)">–</span>}</div></td>
                  <td className={cell}>{row.mfaEnabled ? <Pill tone="green">{t("dash.on")}</Pill> : <span className="text-(--text-dark)">–</span>}</td>
                  <td className={`${cell} text-right whitespace-nowrap tabular-nums text-(--text-washed)`}>{new Date(row.createdAt).toLocaleDateString(lang)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
