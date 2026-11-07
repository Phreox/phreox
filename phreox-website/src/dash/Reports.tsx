import { useState } from "react";
import { call, type Me, useLoad } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { AccountManager } from "./AccountManager.tsx";
import { ago, Avatar, Button, Card, Empty, ErrorLine, Heading, Pill, type Tone, useAction } from "./ui.tsx";

export type Report = { id: string; reporterId: string; reporter: string; accusedId: string; accused: string; spaceId: string; channelId: string; messageId: string; content: string; reason: string; note: string; verified: boolean;
  status: "open" | "review" | "resolved" | "dismissed"; assignee: string; resolution: string; createdAt: number; updatedAt: number; otherReports: number };

const statuses = ["open", "review", "resolved", "dismissed", ""] as const;
const tone: Record<Report["status"], Tone> = { open: "red", review: "orange", resolved: "green", dismissed: "grey" };

/** The reports of messages: a list to take from, and what the team decides about one. */
export function Reports({ me, tick, onChange }: { me: Me; tick: number; onChange: () => void }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<(typeof statuses)[number]>("open");
  const [mine, setMine] = useState(false);
  const [chosen, setChosen] = useState<string>();
  const [resolution, setResolution] = useState<{ id: string; text: string }>();
  const list = useLoad(() => call<Report[]>("GET", `/admin/support/reports?status=${status}`), [status, tick]);
  const { error, run } = useAction();
  const shown = (list.value ?? []).filter((report) => !mine || report.assignee === me.username);
  const report = shown.find((entry) => entry.id === chosen) ?? shown[0];
  const text = resolution?.id === report?.id ? resolution?.text : report?.resolution;

  function update(id: string, body: { status?: string; assignee?: string; resolution?: string }) {
    void run(async () => {
      await call("PUT", `/admin/support/reports/${id}`, body);
      list.reload();
      onChange();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {statuses.map((name) => <Button key={name || "all"} small kind={status === name ? "primary" : "ghost"} onClick={() => setStatus(name)}>{name ? t(`dash.rep.status.${name}` as TextKey) : t("dash.acc.all")}</Button>)}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-(--text-washed)"><input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} />{t("dash.support.mine")}</label>
        </div>

        {shown.length === 0 && <Empty>{t("dash.rep.none")}</Empty>}

        <div className="flex flex-col gap-1.5">
          {shown.map((entry) => (
            <button key={entry.id} type="button" onClick={() => setChosen(entry.id)} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${report?.id === entry.id ? "border-(--border-raised) bg-(--background-raised)" : "border-(--border-surface) bg-(--background-surface) hover:bg-(--background-panel)"}`}>
              <Avatar name={entry.accused || "?"} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm"><span className="font-semibold">{entry.accused || "?"}</span><Pill tone={tone[entry.status]}>{t(`dash.rep.status.${entry.status}` as TextKey)}</Pill></span>
                <span className="block truncate text-xs text-(--text-washed)">{entry.content || "–"}</span>
                <span className="text-xs text-(--text-dark)">{t(`dash.rep.reason.${entry.reason}` as TextKey)} · {ago(entry.createdAt, lang)}{entry.assignee ? ` · ${entry.assignee}` : ""}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {report && (
        <Card className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={report.accused || "?"} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{report.accused || "?"}</p>
              <p className="text-xs text-(--text-dark)">{t("dash.rep.reportedBy")} {report.reporter || "?"} · {new Date(report.createdAt).toLocaleString(lang)}</p>
            </div>
            <Pill tone={tone[report.status]}>{t(`dash.rep.status.${report.status}` as TextKey)}</Pill>
            <Pill tone="violet">{t(`dash.rep.reason.${report.reason}` as TextKey)}</Pill>
            {report.otherReports > 0 && <Pill tone="orange">{t("dash.rep.others", { n: report.otherReports })}</Pill>}
          </div>

          <div>
            <Heading action={<Pill tone={report.verified ? "green" : "grey"}>{report.verified ? t("dash.rep.verified") : t("dash.rep.unverified")}</Pill>}>{t("dash.rep.message")}</Heading>
            <blockquote className="whitespace-pre-wrap break-words rounded-xl border-l-4 border-(--brand) bg-(--background-dark) px-4 py-3 text-sm">{report.content || "–"}</blockquote>
            {report.spaceId && <p className="mt-2 font-mono text-xs text-(--text-dark)">space {report.spaceId.slice(0, 8)} · channel {report.channelId.slice(0, 12)} · message {report.messageId.slice(0, 8)}</p>}
            {report.note && <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm"><span className="text-xs text-(--text-dark)">{t("dash.rep.note")}: </span>{report.note}</p>}
          </div>

          <div className="flex flex-col gap-3">
            <Heading>{t("dash.rep.decision")}</Heading>
            <div className="flex flex-wrap gap-2">
              {report.assignee !== me.username && <Button small kind="ghost" onClick={() => update(report.id, { assignee: "me", status: report.status === "open" ? "review" : report.status })}>{t("dash.support.take")}</Button>}
              {(["review", "resolved", "dismissed", "open"] as const).filter((name) => name !== report.status).map((name) => <Button key={name} small kind={name === "resolved" ? "primary" : "ghost"} onClick={() => update(report.id, { status: name, resolution: text })}>{t(`dash.rep.to.${name}` as TextKey)}</Button>)}
            </div>
            <textarea rows={2} className="w-full resize-none rounded-xl border border-(--border-surface) bg-(--background-dark) px-3 py-2 text-sm outline-none focus:border-(--border-raised)" maxLength={1000} placeholder={t("dash.rep.resolution")} value={text ?? ""} onChange={(event) => setResolution({ id: report.id, text: event.target.value })} />
            <ErrorLine error={error} />
          </div>

          <div>
            <Heading>{t("dash.acct.manage")} · {report.accused}</Heading>
            <AccountManager accountId={report.accusedId} me={me} />
          </div>
        </Card>
      )}
    </div>
  );
}
