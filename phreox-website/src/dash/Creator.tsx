import { useState } from "react";
import { call, type Me, useLoad } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { ago, Avatar, Button, Card, Empty, ErrorLine, Heading, inputClass, Pill, type Tone, useAction } from "./ui.tsx";

type Data = { type: "effect" | "image"; variant?: string; c1?: string; c2?: string; src?: string; opts?: Record<string, number | string> };
export type Deco = { id: string; creatorId: string; creator: string; kind: "avatar" | "profile"; name: string; data: Data; status: "pending" | "approved" | "rejected" | "removed"; reason: string; reviewedBy: string; uses: number; createdAt: number; updatedAt: number; reviewedAt: number };

const statuses = ["pending", "approved", "rejected", "removed", ""] as const;
const tone: Record<Deco["status"], Tone> = { pending: "orange", approved: "green", rejected: "red", removed: "grey" };

/** A simple picture of what a decoration looks like: the colors and the picture. The app draws the movement; this is what the team judges. */
function Preview({ deco }: { deco: Deco }) {
  const { c1 = "#835afc", c2 = "#b39cff", src } = deco.data;
  const image = deco.data.type === "image" && src?.startsWith("data:image/");

  if (deco.kind === "avatar") {
    return (
      <div className="relative grid size-28 place-items-center">
        <span className="absolute inset-3 rounded-full" style={image ? undefined : { border: `3px solid ${c1}`, boxShadow: `0 0 22px ${c2}, inset 0 0 12px ${c2}55` }} />
        <span className="grid size-16 place-items-center rounded-full bg-(--background-raised) text-xl font-semibold">{(deco.creator[0] ?? "?").toUpperCase()}</span>
        {image && <img src={src} alt="" className="absolute inset-0 size-full object-contain" />}
      </div>
    );
  }

  return (
    <div className="relative h-28 w-56 overflow-hidden rounded-2xl border border-(--border-surface) bg-(--background-panel)" style={image ? undefined : { boxShadow: `0 0 26px ${c2}66`, borderColor: c1 }}>
      <div className="h-12 bg-(--background-raised)" />
      <div className="px-3 pt-5 text-xs text-(--text-dark)">{deco.creator}</div>
      {image && <img src={src} alt="" className="absolute inset-0 size-full object-cover" />}
      {!image && <div className="absolute inset-x-0 top-0 h-10" style={{ background: `linear-gradient(180deg, ${c1}55, transparent)` }} />}
    </div>
  );
}

/** The creator portal's other side: what the community made, to be approved or rejected before everybody can wear it. */
export function Creator({ me: _me, tick, onChange }: { me: Me; tick: number; onChange: () => void }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<(typeof statuses)[number]>("pending");
  const [chosen, setChosen] = useState<string>();
  const [reason, setReason] = useState("");
  const list = useLoad(() => call<Deco[]>("GET", `/admin/support/decorations?status=${status}`), [status, tick]);
  const { error, run } = useAction();
  const deco = (list.value ?? []).find((entry) => entry.id === chosen) ?? list.value?.[0];

  function decide(next: "approved" | "rejected" | "removed") {
    if (!deco) return;

    void run(async () => {
      await call("PUT", `/admin/support/decorations/${deco.id}`, { status: next, reason });
      setReason("");
      list.reload();
      onChange();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((name) => <Button key={name || "all"} small kind={status === name ? "primary" : "ghost"} onClick={() => setStatus(name)}>{name ? t(`dash.deco.status.${name}` as TextKey) : t("dash.acc.all")}</Button>)}
        </div>

        {list.value?.length === 0 && <Empty>{t("dash.deco.none")}</Empty>}

        <div className="grid grid-cols-2 gap-2">
          {list.value?.map((entry) => (
            <button key={entry.id} type="button" onClick={() => setChosen(entry.id)} className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${deco?.id === entry.id ? "border-(--border-raised) bg-(--background-raised)" : "border-(--border-surface) bg-(--background-surface) hover:bg-(--background-panel)"}`}>
              <div className="origin-top scale-75"><Preview deco={entry} /></div>
              <span className="w-full truncate text-sm font-semibold">{entry.name}</span>
              <span className="flex items-center gap-1.5 text-xs text-(--text-dark)">{entry.creator} <Pill tone={tone[entry.status]}>{t(`dash.deco.status.${entry.status}` as TextKey)}</Pill></span>
            </button>
          ))}
        </div>
      </div>

      {deco && (
        <Card className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={deco.creator || "?"} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{deco.name}</p>
              <p className="text-xs text-(--text-dark)">{deco.creator} · {t(`dash.deco.kind.${deco.kind}` as TextKey)} · {ago(deco.createdAt, lang)}</p>
            </div>
            <Pill tone={tone[deco.status]}>{t(`dash.deco.status.${deco.status}` as TextKey)}</Pill>
            <Pill tone="violet">{t("dash.deco.uses", { n: deco.uses })}</Pill>
          </div>

          <div className="flex flex-wrap items-center gap-6 rounded-xl border border-(--border-surface) bg-(--background-dark) p-5">
            <Preview deco={deco} />
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
              <p className="text-xs text-(--text-dark)">{t("dash.deco.simple")}</p>
              {deco.data.type === "effect" && (
                <p className="flex flex-wrap items-center gap-2"><Pill tone="grey">{deco.data.variant}</Pill>
                  {[deco.data.c1, deco.data.c2].map((color) => <span key={color} className="inline-flex items-center gap-1.5 font-mono text-xs"><span className="size-4 rounded-full border border-white/20" style={{ background: color }} />{color}</span>)}</p>
              )}
              {deco.data.type === "image" && <Pill tone="grey">{t("dash.deco.picture")}</Pill>}
              {deco.data.opts && Object.keys(deco.data.opts).length > 0 && (
                <p className="flex flex-wrap gap-1.5">{Object.entries(deco.data.opts).map(([key, value]) => <Pill key={key} tone="grey">{key}: {String(value)}</Pill>)}</p>
              )}
            </div>
          </div>

          {deco.reason && <p className="rounded-xl bg-white/5 px-3 py-2 text-sm"><span className="text-xs text-(--text-dark)">{deco.reviewedBy}: </span>{deco.reason}</p>}

          <div className="flex flex-col gap-3">
            <Heading>{t("dash.rep.decision")}</Heading>
            <input className={inputClass} value={reason} maxLength={500} placeholder={t("dash.deco.reason")} onChange={(event) => setReason(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              {deco.status !== "approved" && deco.status !== "removed" && <Button onClick={() => decide("approved")}>{t("dash.deco.approve")}</Button>}
              {deco.status !== "rejected" && deco.status !== "removed" && <Button kind="danger" disabled={reason.trim().length < 3} onClick={() => decide("rejected")}>{t("dash.deco.reject")}</Button>}
              {deco.status === "approved" && <Button kind="danger" disabled={reason.trim().length < 3} onClick={() => decide("removed")}>{t("dash.deco.remove")}</Button>}
            </div>
            <p className="text-xs text-(--text-dark)">{t("dash.deco.told")}</p>
            <ErrorLine error={error} />
          </div>
        </Card>
      )}
    </div>
  );
}
