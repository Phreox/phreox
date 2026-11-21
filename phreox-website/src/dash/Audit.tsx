import { useState } from "react";
import { useDashSettings } from "../dashSettings.ts";
import { useT } from "../i18n.ts";
import { useData } from "./data.ts";
import type { Audit as Entry } from "./types.ts";
import { Chip, Empty, ErrorLine, SearchField, Skeleton, TableShell, Th } from "./ui.tsx";

/** What the team did, the newest first; to search, and to narrow down to one kind of action. */
export function Audit({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const { density } = useDashSettings();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const audit = useData<Entry[]>("/admin/audit", tick);
  const areas = [...new Set((audit.value ?? []).map((row) => row.action.split(".")[0] ?? ""))].filter(Boolean).sort();
  const needle = query.trim().toLowerCase();
  const shown = (audit.value ?? []).filter((row) => (!area || row.action.startsWith(`${area}.`) || row.action === area) && (!needle || `${row.actor} ${row.action} ${row.detail}`.toLowerCase().includes(needle)));
  const cell = density === "compact" ? "px-4 py-1.5" : "px-4 py-2.5";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField className="w-full max-w-sm" placeholder={t("dash.audit.search")} value={query} onChange={setQuery} />
        <div className="flex flex-wrap gap-1.5">
          <Chip on={area === ""} onClick={() => setArea("")}>{t("dash.acc.all")}</Chip>
          {areas.map((name) => <Chip key={name} on={area === name} onClick={() => setArea(area === name ? "" : name)}>{name}</Chip>)}
        </div>
        <span className="ml-auto text-sm tabular-nums text-(--text-dark)">{t("dash.audit.count", { n: shown.length })}</span>
      </div>

      <ErrorLine error={audit.error} />
      {audit.loading && <Skeleton rows={6} />}
      {audit.value && shown.length === 0 && <Empty>{t("dash.audit.none")}</Empty>}

      {shown.length > 0 && (
        <TableShell minWidth="42rem">
          <thead><tr><Th>{t("dash.audit.when")}</Th><Th>{t("dash.audit.who")}</Th><Th>{t("dash.audit.what")}</Th><Th>{t("dash.audit.detail")}</Th></tr></thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td className={`${cell} whitespace-nowrap tabular-nums text-(--text-dark)`}>{new Date(row.at).toLocaleString(lang)}</td>
                <td className={`${cell} font-medium`}>{row.actor}</td>
                <td className={cell}><span className="rounded-md bg-(--background-raised) px-1.5 py-0.5 text-xs text-(--accent)">{row.action}</span></td>
                <td className={`${cell} break-all text-(--text-washed)`}>{row.detail}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
