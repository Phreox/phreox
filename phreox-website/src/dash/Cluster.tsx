import { useEffect } from "react";
import { call, useLoad } from "../api.ts";
import { useT } from "../i18n.ts";
import { Card, Empty, ErrorLine, Heading, Pill, Th } from "./ui.tsx";

type Node = { url: string; self: boolean; healthy: boolean; leaving: boolean; streams: number; heap: number; weight: number; score: number; position: number; cursor: number; lag: number };
type Status = { enabled: boolean; url: string; node: string; position: number; nodes: Node[]; roots: string[]; conflicts: string[] };

const REFRESH_MILLIS = 5000;

/** The services of the cluster as the one that answers sees them: who is up, how busy, how far the databases have been read, who the clients are sent to. */
export function Cluster({ tick }: { tick: number }) {
  const { t } = useT();
  const status = useLoad(() => call<Status>("GET", "/admin/cluster"), [tick]);
  const { reload } = status;

  // The numbers move; the page follows them.
  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MILLIS);

    return () => window.clearInterval(timer);
  }, [reload]);

  const value = status.value;

  if (!value) return <ErrorLine error={status.error} />;
  if (!value.enabled) return <Empty>{t("dash.cluster.off")}</Empty>;

  return (
    <div className="flex flex-col gap-4">
      <ErrorLine error={status.error} />

      <Card className="flex flex-wrap items-center gap-x-8 gap-y-2 !p-4 text-sm">
        <div><span className="text-(--text-dark)">{t("dash.cluster.this")}</span> <span className="font-mono">{value.url}</span></div>
        <div><span className="text-(--text-dark)">{t("dash.cluster.node")}</span> <span className="font-mono">{value.node.slice(0, 8)}</span></div>
        <div><span className="text-(--text-dark)">{t("dash.cluster.position")}</span> <span className="font-mono text-(--accent)">{value.position}</span></div>
      </Card>

      <Card className="!p-0">
        <div className="overflow-auto rounded-xl">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-(--background-surface)">
              <tr>
                <Th>{t("dash.cluster.service")}</Th>
                <Th>{t("dash.cluster.state")}</Th>
                <Th>{t("dash.cluster.streams")}</Th>
                <Th>{t("dash.cluster.memory")}</Th>
                <Th>{t("dash.cluster.weight")}</Th>
                <Th>{t("dash.cluster.score")}</Th>
                <Th>{t("dash.cluster.log")}</Th>
                <Th>{t("dash.cluster.read")}</Th>
                <Th>{t("dash.cluster.lag")}</Th>
              </tr>
            </thead>
            <tbody>
              {value.nodes.map((node) => (
                <tr key={node.url} className="border-t border-white/5 hover:bg-white/3">
                  <td className="px-3 py-2 font-mono">{node.url}{node.self && <span className="ml-2 text-xs text-(--text-dark)">{t("dash.cluster.thisOne")}</span>}</td>
                  <td className="px-3 py-2">{node.leaving ? <Pill tone="orange">{t("dash.cluster.leaving")}</Pill> : node.healthy ? <Pill tone="green">{t("dash.cluster.up")}</Pill> : <Pill tone="red">{t("dash.cluster.down")}</Pill>}</td>
                  <td className="px-3 py-2 font-mono">{node.streams}</td>
                  <td className="px-3 py-2 font-mono">{Math.round(node.heap * 100)}%</td>
                  <td className="px-3 py-2 font-mono">{node.weight}</td>
                  <td className="px-3 py-2 font-mono">{node.score.toFixed(1)}</td>
                  <td className="px-3 py-2 font-mono">{node.position}</td>
                  <td className="px-3 py-2 font-mono">{node.self ? "–" : node.cursor}</td>
                  <td className="px-3 py-2 font-mono">{node.self ? "–" : <span className={node.lag > 50 ? "text-[#ff7a93]" : node.lag > 0 ? "text-[#ffb86b]" : "text-[#3ecf8e]"}>{node.lag}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="!p-4">
        <Heading>{t("dash.cluster.roots")}</Heading>
        <p className="mb-2 text-xs text-(--text-dark)">{t("dash.cluster.rootsNote")}</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5 font-mono text-sm">
          {value.roots.map((root) => <li key={root}>{root}</li>)}
        </ol>
      </Card>

      <Card className="!p-4">
        <Heading>{t("dash.cluster.conflicts")}</Heading>
        {value.conflicts.length === 0 && <p className="text-sm text-[#3ecf8e]">{t("dash.cluster.noConflicts")}</p>}
        {value.conflicts.length > 0 && <p className="mb-2 text-xs text-(--text-dark)">{t("dash.cluster.conflictsNote")}</p>}
        <ul className="flex flex-col gap-1 font-mono text-xs text-(--text-washed)">
          {value.conflicts.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Card>
    </div>
  );
}
