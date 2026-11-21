import { useT } from "../i18n.ts";
import { useData } from "./data.ts";
import { duration, megabytes, type System as Sys } from "./types.ts";
import { ErrorLine, Facts, Meter, Panel, Skeleton } from "./ui.tsx";

/** The service that answers this dashboard: how long it runs, on what, and how much it holds. */
export function System({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const system = useData<Sys>("/admin/system", tick);
  const value = system.value;

  if (!value) return system.error ? <ErrorLine error={system.error} /> : <Skeleton rows={6} />;

  const share = value.heapUsed / Math.max(1, value.heapMax);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={t("dash.sys.process")}>
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-sm text-(--text-washed)">{t("dash.sys.heap")}</span>
              <span className="text-sm tabular-nums">{megabytes(value.heapUsed)} <span className="text-(--text-dark)">/ {megabytes(value.heapMax)}</span></span>
            </div>
            <Meter share={share} label={t("dash.sys.heap")} />
          </div>
          <Facts rows={[
            [t("dash.sys.up"), duration(value.uptimeMillis, lang)],
            [t("dash.sys.started"), new Date(value.startedAt).toLocaleString(lang)],
            [t("dash.sys.java"), value.java],
            [t("dash.sys.os"), value.os],
            [t("dash.sys.cpus"), value.processors],
          ]} />
        </div>
      </Panel>

      <Panel title={t("dash.sys.data")}>
        <Facts rows={[
          [t("dash.ov.accounts"), value.accounts],
          [t("dash.ov.mfa"), value.mfaAccounts],
          [t("dash.ov.spaces"), value.spaces],
          [t("dash.ov.members"), value.spaceMembers],
          [t("dash.ov.messages"), value.spaceMessages],
          [t("dash.ov.invites"), value.spaceInvites],
          [t("dash.ov.bots"), value.bots],
          [t("dash.ov.badges"), value.badgeGrants],
        ]} />
      </Panel>
    </div>
  );
}
