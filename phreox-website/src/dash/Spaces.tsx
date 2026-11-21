import { useState } from "react";
import { useDashSettings } from "../dashSettings.ts";
import { useT } from "../i18n.ts";
import { useData } from "./data.ts";
import type { SpaceRow } from "./types.ts";
import { Empty, ErrorLine, Pill, SearchField, Skeleton, TableShell, Th } from "./ui.tsx";

/** Every space of the service, to look one up. */
export function Spaces({ tick }: { tick: number }) {
  const { t, lang } = useT();
  const { ids, density } = useDashSettings();
  const [query, setQuery] = useState("");
  const spaces = useData<SpaceRow[]>("/admin/spaces", tick);
  const needle = query.trim().toLowerCase();
  const shown = (spaces.value ?? []).filter((row) => !needle || row.name.toLowerCase().includes(needle) || row.owner.toLowerCase().includes(needle) || row.id.startsWith(needle));
  const cell = density === "compact" ? "px-4 py-1.5" : "px-4 py-3";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchField className="w-full max-w-sm" placeholder={t("dash.sp.search")} value={query} onChange={setQuery} />
        <span className="ml-auto text-sm tabular-nums text-(--text-dark)">{t("dash.sp.count", { n: shown.length })}</span>
      </div>

      <ErrorLine error={spaces.error} />
      {spaces.loading && <Skeleton rows={5} />}
      {spaces.value && shown.length === 0 && <Empty>{t("dash.sp.none")}</Empty>}

      {shown.length > 0 && (
        <TableShell minWidth="52rem">
          <thead>
            <tr><Th>{t("dash.sp.name")}</Th><Th>{t("dash.sp.owner")}</Th><Th>{t("dash.sp.visibility")}</Th><Th className="text-right">{t("dash.sp.members")}</Th><Th className="text-right">{t("dash.sp.channels")}</Th><Th className="text-right">Volt</Th><Th className="text-right">{t("dash.acc.created")}</Th><Th className="text-right">{t("dash.sp.updated")}</Th></tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                <td className={cell}>
                  <p className="font-medium">{row.name || "–"}</p>
                  {ids && <p className="text-xs tabular-nums text-(--text-dark)">{row.id}</p>}
                </td>
                <td className={`${cell} text-(--text-washed)`}>{row.owner || "–"}</td>
                <td className={cell}>
                  <span className="flex flex-wrap gap-1">
                    <Pill tone={row.visibility === "public" ? "green" : "grey"}>{row.visibility === "public" ? t("dash.sp.public") : t("dash.sp.private")}</Pill>
                    {row.listed && <Pill tone="violet">{t("dash.sp.listed")}</Pill>}
                    {row.applicationsOpen && <Pill>{t("dash.sp.apps")}</Pill>}
                  </span>
                </td>
                <td className={`${cell} text-right tabular-nums`}>{row.members}</td>
                <td className={`${cell} text-right tabular-nums`}>{row.channels}</td>
                {/* An older service does not count Volt yet: then there is nothing to show. */}
                <td className={`${cell} text-right whitespace-nowrap tabular-nums`}>{typeof row.volt === "number" ? <>{row.volt} <span className="text-xs text-(--text-dark)">{t("dash.sp.level", { n: row.level ?? 0 })}</span></> : "–"}</td>
                <td className={`${cell} text-right whitespace-nowrap tabular-nums text-(--text-washed)`}>{new Date(row.createdAt).toLocaleDateString(lang)}</td>
                <td className={`${cell} text-right whitespace-nowrap tabular-nums text-(--text-washed)`}>{new Date(row.updatedAt).toLocaleDateString(lang)}</td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
