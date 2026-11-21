import type { ReactNode } from "react";
import type { NewsPost } from "../api.ts";
import { useDashSettings } from "../dashSettings.ts";
import { type TextKey, useT } from "../i18n.ts";
import { useData } from "./data.ts";
import { type Audit, type ClusterStatus, duration, megabytes, type Overview as Numbers, type Queue, type Role, type Row, type SpaceRow, type System, type Tab } from "./types.ts";
import { ago, Avatar, Button, Facts, Meter, Panel, Pill, Skeleton, Stat } from "./ui.tsx";

function More({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <Button kind="quiet" small onClick={onClick}>{children}</Button>;
}

/** A list inside a panel: rows from edge to edge with a line between them. */
function Rows({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col divide-y divide-(--border-surface) border-t border-(--border-surface) empty:hidden">{children}</ul>;
}

const rowClass = "flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm";

/** What waits for somebody: the one row of the overview that asks to be acted on. */
function QueueStrip({ queue, go }: { queue?: Queue; go: (tab: Tab) => void }) {
  const { t } = useT();
  const items: [string, number | undefined, Tab][] = [
    [t("dash.ov.reportsOpen"), queue ? queue.reportsOpen + queue.reportsReview : undefined, "reports"],
    [t("dash.ov.ticketsOpen"), queue?.ticketsOpen, "tickets"],
    [t("dash.ov.decorations"), queue?.decorationsPending, "creator"],
    [t("dash.ov.mineWork"), queue ? queue.reportsMine + queue.ticketsMine : undefined, "tickets"],
  ];

  return (
    <section aria-label={t("dash.ov.queue")} className="grid overflow-hidden rounded-2xl border border-(--border-surface) bg-(--background-surface) sm:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, number, tab], index) => (
        <button key={label} type="button" className={`group flex cursor-pointer items-end justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-(--background-panel) ${index > 0 ? "border-t border-(--border-surface) sm:border-l xl:border-t-0" : ""} ${index === 1 ? "sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`} onClick={() => go(tab)}>
          <span className="text-sm text-(--text-washed) group-hover:text-white">{label}</span>
          <span className={`display text-[2.6rem] tabular-nums ${number ? "text-(--volt)" : "text-(--text-dark)"}`}>{number ?? "–"}</span>
        </button>
      ))}
    </section>
  );
}

function NumbersStrip({ tick }: { tick: number }) {
  const { t } = useT();
  const overview = useData<Numbers>("/admin/overview", tick).value;
  const system = useData<System>("/admin/system", tick).value;
  const share = system && system.accounts > 0 ? `${Math.round((system.mfaAccounts / system.accounts) * 100)} %` : undefined;

  return (
    <section aria-label={t("dash.w.stats")} className="dash-numbers grid grid-cols-2 overflow-hidden rounded-2xl border border-(--border-surface) bg-(--background-surface) sm:grid-cols-3 xl:grid-cols-6">
      <Stat label={t("dash.ov.accounts")} value={overview?.accounts} hint={overview ? `+${overview.newAccounts7d} ${t("dash.ov.week")}` : undefined} />
      <Stat label={t("dash.ov.spaces")} value={overview?.spaces} hint={system ? `${system.spaceMembers} ${t("dash.ov.members")}` : undefined} />
      <Stat label={t("dash.ov.messages")} value={system?.spaceMessages} />
      <Stat label={t("dash.ov.mfa")} value={share} hint={system ? `${system.mfaAccounts} / ${system.accounts}` : undefined} />
      <Stat label={t("dash.ov.bots")} value={system?.bots} hint={system ? `${system.spaceInvites} ${t("dash.ov.invites")}` : undefined} />
      <Stat label={t("dash.ov.badges")} value={system?.badgeGrants} hint={overview ? `${overview.superAdmins} ${t("dash.ov.supers")}` : undefined} />
    </section>
  );
}

function ClusterPanel({ tick, go }: { tick: number; go: (tab: Tab) => void }) {
  const { t } = useT();
  const status = useData<ClusterStatus>("/admin/cluster", tick).value;

  if (!status?.enabled) return null;

  const up = status.nodes.filter((node) => node.healthy && !node.leaving).length;

  return (
    <Panel flush title={t("dash.tab.cluster")} hint={t("dash.cluster.upOf", { up, all: status.nodes.length })} action={<More onClick={() => go("cluster")}>{t("dash.open")}</More>}>
      <Rows>
        {status.nodes.map((node) => (
          <li key={node.url} className={rowClass}>
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${node.leaving ? "bg-[#ffb86b]" : node.healthy ? "bg-[#3ecf8e]" : "bg-[#ff7a93]"}`} />
            <span className="min-w-0 flex-1 truncate">{node.url.replace(/^https?:\/\//, "")}</span>
            {node.self && <Pill tone="violet">{t("dash.cluster.here")}</Pill>}
            <span className="w-16 text-right text-xs tabular-nums text-(--text-dark)">{node.healthy ? t("dash.cluster.streamsN", { n: node.streams }) : t("dash.cluster.down")}</span>
          </li>
        ))}
      </Rows>
    </Panel>
  );
}

/** The first page: what waits, the numbers, and the newest of each list. */
export function Overview({ tick, go, queue, isSuper, openAccount }: { tick: number; go: (tab: Tab) => void; queue?: Queue; isSuper: boolean; openAccount: (id: string) => void }) {
  const { t, lang } = useT();
  const { widgets, ids } = useDashSettings();
  const accounts = useData<Row[]>(widgets.accounts ? "/admin/accounts?query=" : null, tick);
  const spaces = useData<SpaceRow[]>(widgets.spaces ? "/admin/spaces" : null, tick);
  const audit = useData<Audit[]>(widgets.audit ? "/admin/audit" : null, tick);
  const news = useData<NewsPost[]>(widgets.news ? "/news" : null, tick);
  const roles = useData<Role[]>(widgets.roles ? "/admin/roles" : null, tick);
  const system = useData<System>(widgets.system ? "/admin/system" : null, tick).value;

  return (
    <div className="flex flex-col gap-4">
      {widgets.queue && <QueueStrip queue={queue} go={go} />}
      {widgets.stats && <NumbersStrip tick={tick} />}

      <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {widgets.accounts && (
          <Panel flush title={t("dash.w.accounts")} action={<More onClick={() => go("accounts")}>{t("dash.all")}</More>}>
            {accounts.loading && <div className="px-5 pb-4"><Skeleton /></div>}
            <Rows>
              {accounts.value?.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 7).map((row) => (
                <li key={row.id}>
                  <button type="button" className={`${rowClass} cursor-pointer transition-colors hover:bg-(--background-panel)`} onClick={() => openAccount(row.id)}>
                    <Avatar name={row.username} size={24} />
                    <span className="min-w-0 truncate font-medium">{row.username}</span>
                    {row.flags.slice(0, 2).map((flag) => <Pill key={flag} tone="violet">{t(`flag.${flag}` as TextKey)}</Pill>)}
                    {ids && <span className="text-xs tabular-nums text-(--text-dark)">{row.id.slice(0, 8)}</span>}
                    <span className="ml-auto shrink-0 text-xs text-(--text-dark)">{ago(row.createdAt, lang)}</span>
                  </button>
                </li>
              ))}
            </Rows>
          </Panel>
        )}

        {widgets.audit && (
          <Panel flush title={t("dash.w.audit")} action={<More onClick={() => go("audit")}>{t("dash.all")}</More>}>
            {audit.loading && <div className="px-5 pb-4"><Skeleton /></div>}
            {audit.value?.length === 0 && <p className="px-5 pb-5 text-sm text-(--text-dark)">{t("dash.audit.none")}</p>}
            <Rows>
              {audit.value?.slice(0, 7).map((row) => (
                <li key={row.id} className={rowClass}>
                  <span className="shrink-0 font-medium">{row.actor}</span>
                  <span className="shrink-0 rounded-md bg-(--background-raised) px-1.5 py-0.5 text-xs text-(--accent)">{row.action}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-(--text-dark)">{row.detail}</span>
                  <span className="shrink-0 text-xs text-(--text-dark)">{ago(row.at, lang)}</span>
                </li>
              ))}
            </Rows>
          </Panel>
        )}

        {isSuper && <ClusterPanel tick={tick} go={go} />}

        {widgets.spaces && (
          <Panel flush title={t("dash.w.spaces")} action={<More onClick={() => go("spaces")}>{t("dash.all")}</More>}>
            {spaces.value?.length === 0 && <p className="px-5 pb-5 text-sm text-(--text-dark)">{t("dash.sp.none")}</p>}
            <Rows>
              {spaces.value?.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 7).map((row) => (
                <li key={row.id} className={rowClass}>
                  <span className="min-w-0 truncate font-medium">{row.name || "–"}</span>
                  <span className="min-w-0 truncate text-xs text-(--text-dark)">{row.owner}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-(--text-washed)">{row.members} {t("dash.sp.members")}</span>
                </li>
              ))}
            </Rows>
          </Panel>
        )}

        {widgets.news && (
          <Panel flush title={t("dash.w.news")} action={<More onClick={() => go("news")}>{t("dash.all")}</More>}>
            {news.value?.length === 0 && <p className="px-5 pb-5 text-sm text-(--text-dark)">{t("dash.news.none")}</p>}
            <Rows>
              {news.value?.slice(0, 6).map((post) => (
                <li key={post.id} className={rowClass}>
                  <Pill tone={post.pinned ? "orange" : "grey"}>{t(`cat.${post.category}` as TextKey)}</Pill>
                  <span className="min-w-0 flex-1 truncate font-medium">{post.title}</span>
                  <span className="shrink-0 text-xs text-(--text-dark)">{new Date(post.createdAt).toLocaleDateString(lang)}</span>
                </li>
              ))}
            </Rows>
          </Panel>
        )}

        {widgets.system && (
          <Panel title={t("dash.w.system")} action={<More onClick={() => go("system")}>{t("dash.open")}</More>}>
            {!system ? <Skeleton rows={4} /> : (
              <div className="flex flex-col gap-4">
                <Facts rows={[[t("dash.sys.up"), duration(system.uptimeMillis, lang)], [t("dash.sys.java"), system.java], [t("dash.sys.heap"), `${megabytes(system.heapUsed)} / ${megabytes(system.heapMax)}`]]} />
                <Meter share={system.heapUsed / Math.max(1, system.heapMax)} label={t("dash.sys.heap")} />
              </div>
            )}
          </Panel>
        )}

        {widgets.roles && (
          <Panel flush title={t("dash.w.roles")} action={<More onClick={() => go("roles")}>{t("dash.all")}</More>}>
            {roles.value?.length === 0 && <p className="px-5 pb-5 text-sm text-(--text-dark)">{t("dash.roles.none")}</p>}
            <Rows>
              {roles.value?.map((role) => (
                <li key={role.name} className={`${rowClass} flex-wrap`}>
                  <span className="font-medium">{role.name}</span>
                  {role.flags.map((flag) => <Pill key={flag}>{t(`flag.${flag}` as TextKey)}</Pill>)}
                </li>
              ))}
            </Rows>
          </Panel>
        )}
      </div>
    </div>
  );
}
