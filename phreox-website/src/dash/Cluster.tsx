import { useEffect, useState } from "react";
import { call } from "../api.ts";
import { useT } from "../i18n.ts";
import { refreshData, useData } from "./data.ts";
import { Dialog, useOverlays, useRun } from "./overlay.tsx";
import { type ClusterNode, type ClusterStatus, hostOf, type Intent } from "./types.ts";
import { Button, CopyButton, Empty, ErrorLine, Facts, Field, inputClass, Meter, Panel, Pill, Skeleton, TableShell, Th } from "./ui.tsx";

const REFRESH_MILLIS = 5000;
const GREEN = "#3ecf8e";
const ORANGE = "#ffb86b";
const RED = "#ff7a93";

function colorOf(node: ClusterNode) {
  return node.leaving ? ORANGE : node.healthy ? GREEN : RED;
}

function StatePill({ node }: { node: ClusterNode }) {
  const { t } = useT();

  return node.leaving ? <Pill tone="orange">{t("dash.cluster.leaving")}</Pill> : node.healthy ? <Pill tone="green">{t("dash.cluster.up")}</Pill> : <Pill tone="red">{t("dash.cluster.down")}</Pill>;
}

// ---- the picture of the mesh -------------------------------------------------------------------------------------------

const WIDTH = 640;
const HEIGHT = 330;

/** Where the services stand: on an oval, this one first. One alone stands in the middle. */
function places(count: number): [number, number][] {
  if (count === 1) return [[WIDTH / 2, HEIGHT / 2 - 10]];

  const start = count === 2 ? Math.PI : -Math.PI / 2;

  return Array.from({ length: count }, (_, index) => {
    const angle = start + (index / count) * Math.PI * 2;

    return [WIDTH / 2 + Math.cos(angle) * 210, HEIGHT / 2 - 14 + Math.sin(angle) * 112];
  });
}

/**
 * The cluster as it is: every service copies from every other one, so each pair has a line. The lines of this service carry what it
 * knows: green and moving when it has read everything of the other one, orange when it is behind, red and broken when the other one
 * does not answer.
 */
function Mesh({ nodes, selected, onSelect }: { nodes: ClusterNode[]; selected: string; onSelect: (url: string) => void }) {
  const { t } = useT();
  const ordered = [...nodes.filter((node) => node.self), ...nodes.filter((node) => !node.self)];
  const spots = places(ordered.length);
  const here = spots[0]!;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="group" aria-label={t("dash.cluster.meshLabel")}>
      {/* The other pairs: they copy from each other too, but this service does not see how far they are. */}
      {ordered.map((_, first) => ordered.map((__, second) => first > 0 && second > first && (
        <line key={`${first}-${second}`} x1={spots[first]![0]} y1={spots[first]![1]} x2={spots[second]![0]} y2={spots[second]![1]} stroke="var(--border-panel)" strokeWidth="1.5" />
      )))}

      {ordered.map((node, index) => index > 0 && (
        <line key={node.url} x1={here[0]} y1={here[1]} x2={spots[index]![0]} y2={spots[index]![1]} stroke={node.leaving ? ORANGE : !node.healthy ? RED : node.lag > 0 ? ORANGE : GREEN} strokeWidth="2" strokeLinecap="round" strokeDasharray={node.healthy ? "2 9" : "7 7"} className={node.healthy ? "dash-flow" : undefined} opacity={node.healthy ? 0.9 : 0.6} />
      ))}

      {ordered.map((node, index) => {
        const [x, y] = spots[index]!;
        const color = colorOf(node);
        const active = node.url === selected;

        return (
          <g key={node.url} role="button" tabIndex={0} aria-pressed={active} aria-label={`${hostOf(node.url)}: ${node.leaving ? t("dash.cluster.leaving") : node.healthy ? t("dash.cluster.up") : t("dash.cluster.down")}`} className="cursor-pointer outline-none [&:focus-visible>circle:first-of-type]:stroke-(--volt)" onClick={() => onSelect(node.url)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node.url); } }}>
            <circle cx={x} cy={y} r="38" fill="transparent" stroke={active ? "var(--brand)" : "transparent"} strokeWidth="2" />
            {node.healthy && !node.leaving && <circle cx={x} cy={y} r="30" fill="none" stroke={color} strokeWidth="1.5" className="dash-pulse" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${index * 0.7}s` }} />}
            <circle cx={x} cy={y} r="30" fill="var(--background-panel)" stroke={color} strokeWidth="2" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className="display fill-current" fontSize="22">{node.healthy ? node.streams : "–"}</text>
            <text x={x} y={y + 54} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--text-default)">{hostOf(node.url)}</text>
            <text x={x} y={y + 70} textAnchor="middle" fontSize="11" fill="var(--text-dark)">{node.self ? t("dash.cluster.here") : node.leaving ? t("dash.cluster.leaving") : !node.healthy ? t("dash.cluster.down") : node.lag > 0 ? t("dash.cluster.behind", { n: node.lag }) : t("dash.cluster.inSync")}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- adding a service ---------------------------------------------------------------------------------------------------

/** Names a new service. The dialog also says what the new server itself needs, since naming it here is only one half. */
function AddNode({ status, onClose }: { status: ClusterStatus; onClose: () => void }) {
  const { t } = useT();
  const [url, setUrl] = useState("https://");
  const { busy, run } = useRun();
  const address = url.trim().replace(/\/+$/, "");
  const valid = /^https?:\/\/[^\s/]+$/.test(address) && address !== status.url;
  const environment = `PHREOX_CLUSTER_KEY=${t("dash.cluster.sameKey")}\nPHREOX_CLUSTER_URL=${valid ? address : "https://…"}\nPHREOX_CLUSTER_PEERS=${status.url}`;

  const add = () => void run(async () => {
    await call("POST", "/admin/cluster/nodes", { url: address });
    refreshData("/admin/cluster");
    onClose();
  }, t("dash.cluster.added", { host: hostOf(address) }));

  return (
    <Dialog size="lg" title={t("dash.cluster.addTitle")} description={t("dash.cluster.addText")} onClose={onClose} footer={<>
      <Button kind="ghost" onClick={onClose}>{t("common.cancel")}</Button>
      <Button busy={busy} disabled={!valid} onClick={add}>{t("dash.cluster.add")}</Button>
    </>}>
      <form className="flex flex-col gap-5" onSubmit={(event) => { event.preventDefault(); if (valid) add(); }}>
        <Field label={t("dash.cluster.address")} hint={t("dash.cluster.addressHint")}>
          <input data-autofocus className={inputClass} inputMode="url" spellCheck={false} placeholder="https://service02.example" value={url} onChange={(event) => setUrl(event.target.value)} />
        </Field>

        <div>
          <h3 className="mb-2 text-sm font-medium text-(--text-washed)">{t("dash.cluster.needs")}</h3>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm text-(--text-washed) marker:text-(--text-dark)">
            <li>{t("dash.cluster.step.keys")}</li>
            <li>
              {t("dash.cluster.step.env")}
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-(--border-surface) bg-(--background-dark) p-3">
                <pre className="min-w-0 flex-1 overflow-x-auto text-xs leading-relaxed text-(--text-default)">{environment}</pre>
                <CopyButton text={environment} />
              </div>
            </li>
            <li>{t("dash.cluster.step.fill")}</li>
          </ol>
        </div>
      </form>
    </Dialog>
  );
}

// ---- the page ------------------------------------------------------------------------------------------------------------

function NodeDetail({ node, onRemove }: { node: ClusterNode; onRemove: () => void }) {
  const { t } = useT();

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-base font-semibold">{hostOf(node.url)}</h3>
        {node.self && <Pill tone="violet">{t("dash.cluster.here")}</Pill>}
        <StatePill node={node} />
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-sm"><span className="text-(--text-washed)">{t("dash.cluster.memory")}</span><span className="tabular-nums">{node.healthy ? `${Math.round(node.heap * 100)} %` : "–"}</span></div>
        <Meter share={node.healthy ? node.heap : 0} label={t("dash.cluster.memory")} />
      </div>

      <Facts rows={[
        [t("dash.cluster.streams"), node.healthy ? node.streams : "–"],
        [t("dash.cluster.score"), node.healthy ? node.score.toFixed(1) : "–"],
        [t("dash.cluster.weight"), node.weight],
        [t("dash.cluster.log"), node.position],
        ...(node.self ? [] : [[t("dash.cluster.read"), node.cursor], [t("dash.cluster.lag"), <span key="lag" style={{ color: node.lag > 50 ? RED : node.lag > 0 ? ORANGE : GREEN }}>{node.lag}</span>]] as [string, React.ReactNode][]),
      ]} />

      <p className="text-xs break-all text-(--text-dark)">{node.url}</p>

      {!node.self && <div className="mt-auto"><Button kind="danger" small onClick={onRemove}>{t("dash.cluster.remove")}</Button></div>}
    </div>
  );
}

/** The services of the cluster as the one that answers sees them: who is up, how busy, how far the databases have been read, who the clients are sent to. */
export function Cluster({ tick, intent, done }: { tick: number; intent?: Intent; done: () => void }) {
  const { t } = useT();
  const { ask } = useOverlays();
  const status = useData<ClusterStatus>("/admin/cluster", tick);
  const { reload } = status;
  const [selected, setSelected] = useState<string>();
  const [adding, setAdding] = useState(false);
  const { run } = useRun();

  // The numbers move; the page follows them.
  useEffect(() => {
    const timer = window.setInterval(reload, REFRESH_MILLIS);

    return () => window.clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (intent === "add-node") {
      setAdding(true);
      done();
    }
  }, [intent, done]);

  const value = status.value;

  if (!value) return status.error ? <ErrorLine error={status.error} /> : <Skeleton rows={6} />;

  if (!value.enabled) {
    const environment = `PHREOX_CLUSTER_KEY=${t("dash.cluster.newKey")}\nPHREOX_CLUSTER_URL=https://…`;

    return (
      <Empty>
        <span className="block text-base font-semibold text-(--text-default)">{t("dash.cluster.offTitle")}</span>
        <span className="mt-2 block">{t("dash.cluster.off")}</span>
        <code className="mt-4 block rounded-xl bg-(--background-dark) p-3 text-left text-xs whitespace-pre text-(--text-default)">{environment}</code>
      </Empty>
    );
  }

  const up = value.nodes.filter((node) => node.healthy && !node.leaving).length;
  const behind = value.nodes.filter((node) => !node.self && node.healthy && node.lag > 0);
  const current = value.nodes.find((node) => node.url === selected) ?? value.nodes.find((node) => node.self) ?? value.nodes[0]!;

  const remove = async (node: ClusterNode) => {
    if (!await ask({ title: t("dash.cluster.removeTitle", { host: hostOf(node.url) }), text: t("dash.cluster.removeText"), confirm: t("dash.cluster.remove"), danger: true })) return;

    void run(async () => {
      await call("POST", "/admin/cluster/nodes/remove", { url: node.url });
      setSelected(undefined);
      refreshData("/admin/cluster");
    }, t("dash.cluster.removed", { host: hostOf(node.url) }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: up === value.nodes.length ? GREEN : up > 0 ? ORANGE : RED }} />
          <span className="font-semibold">{t("dash.cluster.upOf", { up, all: value.nodes.length })}</span>
          <span className="text-(--text-washed)">{up < value.nodes.length ? t("dash.cluster.someDown") : behind.length > 0 ? t("dash.cluster.catchingUp", { n: behind.length }) : t("dash.cluster.allSynced")}</span>
        </p>
        <span className="ml-auto"><Button onClick={() => setAdding(true)}>{t("dash.cluster.add")}</Button></span>
      </div>

      <ErrorLine error={status.error} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={t("dash.cluster.mesh")} hint={t("dash.cluster.meshHint")}>
          <div className="overflow-x-auto"><div className="min-w-[30rem]"><Mesh nodes={value.nodes} selected={current.url} onSelect={setSelected} /></div></div>
        </Panel>
        <Panel><NodeDetail node={current} onRemove={() => void remove(current)} /></Panel>
      </div>

      <TableShell minWidth="48rem">
        <thead>
          <tr>
            <Th>{t("dash.cluster.service")}</Th><Th>{t("dash.cluster.state")}</Th><Th className="text-right">{t("dash.cluster.streams")}</Th><Th className="text-right">{t("dash.cluster.memory")}</Th><Th className="text-right">{t("dash.cluster.score")}</Th><Th className="text-right">{t("dash.cluster.log")}</Th><Th className="text-right">{t("dash.cluster.read")}</Th><Th className="text-right">{t("dash.cluster.lag")}</Th>
          </tr>
        </thead>
        <tbody>
          {value.nodes.map((node) => (
            <tr key={node.url} className="cursor-pointer" aria-selected={node.url === current.url} onClick={() => setSelected(node.url)}>
              <td className="px-4 py-2.5"><span className="flex items-center gap-2"><span className="font-medium">{hostOf(node.url)}</span>{node.self && <Pill tone="violet">{t("dash.cluster.here")}</Pill>}</span></td>
              <td className="px-4 py-2.5"><StatePill node={node} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.healthy ? node.streams : "–"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.healthy ? `${Math.round(node.heap * 100)} %` : "–"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.healthy ? node.score.toFixed(1) : "–"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.position}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.self ? "–" : node.cursor}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{node.self ? "–" : <span style={{ color: node.lag > 50 ? RED : node.lag > 0 ? ORANGE : GREEN }}>{node.lag}</span>}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel title={t("dash.cluster.roots")} hint={t("dash.cluster.rootsNote")}>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm marker:text-(--text-dark)">
            {value.roots.map((root) => <li key={root}>{root}</li>)}
          </ol>
        </Panel>

        <Panel title={t("dash.cluster.conflicts")} hint={value.conflicts.length > 0 ? t("dash.cluster.conflictsNote") : undefined}>
          {value.conflicts.length === 0 && <p className="text-sm" style={{ color: GREEN }}>{t("dash.cluster.noConflicts")}</p>}
          <ul className="flex flex-col gap-1 text-xs break-all text-(--text-washed)">
            {value.conflicts.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </Panel>
      </div>

      {adding && <AddNode status={value} onClose={() => setAdding(false)} />}
    </div>
  );
}
