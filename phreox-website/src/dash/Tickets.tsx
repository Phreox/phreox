import { useState } from "react";
import { call, type Me, useLoad } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { AccountManager } from "./AccountManager.tsx";
import { ago, Avatar, Button, Card, Empty, ErrorLine, Heading, inputClass, Pill, type Tone, useAction } from "./ui.tsx";

type Ticket = { id: string; requesterId: string; requester: string; subject: string; category: string; status: "open" | "pending" | "closed"; assignee: string; createdAt: number; updatedAt: number; messages: number };
type Message = { id: string; author: string; staff: boolean; internal: boolean; body: string; createdAt: number };
type Thread = { ticket: Ticket; messages: Message[] };
type Canned = { id: string; title: string; body: string; createdBy: string };

const statuses = ["open", "pending", "closed", ""] as const;
const tone: Record<Ticket["status"], Tone> = { open: "orange", pending: "green", closed: "grey" };

function Templates({ onPick }: { onPick: (body: string) => void }) {
  const { t } = useT();
  const canned = useLoad(() => call<Canned[]>("GET", "/admin/support/canned"));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);
  const { error, run } = useAction();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {canned.value?.map((reply) => <Button key={reply.id} small kind="ghost" onClick={() => onPick(reply.body)}>{reply.title}</Button>)}
        <button type="button" className="cursor-pointer text-xs text-(--accent) hover:underline" onClick={() => setEditing(!editing)}>{editing ? t("common.cancel") : t("dash.tickets.manage")}</button>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 rounded-xl border border-(--border-surface) bg-(--background-dark) p-3">
          {canned.value?.map((reply) => (
            <p key={reply.id} className="flex items-center gap-2 text-xs"><span className="font-semibold">{reply.title}</span><span className="min-w-0 flex-1 truncate text-(--text-dark)">{reply.body}</span>
              <button type="button" className="cursor-pointer text-[#ff7a93] hover:underline" onClick={() => void run(async () => { await call("DELETE", `/admin/support/canned/${reply.id}`); canned.reload(); })}>{t("common.delete")}</button></p>
          ))}
          <input className={inputClass} value={title} maxLength={60} placeholder={t("dash.tickets.templateTitle")} onChange={(event) => setTitle(event.target.value)} />
          <textarea rows={2} className={`${inputClass} resize-none`} value={body} maxLength={2000} placeholder={t("dash.tickets.templateBody")} onChange={(event) => setBody(event.target.value)} />
          <Button small disabled={!title.trim() || !body.trim()} onClick={() => void run(async () => { await call("POST", "/admin/support/canned", { title, body }); setTitle(""); setBody(""); canned.reload(); })}>{t("dash.notes.save")}</Button>
          <ErrorLine error={error} />
        </div>
      )}
    </div>
  );
}

/** The tickets of the accounts: the list, the conversation, and what the team does with it. */
export function Tickets({ me, tick, onChange }: { me: Me; tick: number; onChange: () => void }) {
  const { t, lang } = useT();
  const [status, setStatus] = useState<(typeof statuses)[number]>("open");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string>();
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const list = useLoad(() => call<Ticket[]>("GET", `/admin/support/tickets?status=${status}`), [status, tick]);
  const needle = query.trim().toLowerCase();
  const shown = (list.value ?? []).filter((ticket) => (!mine || ticket.assignee === me.username) && (!needle || ticket.subject.toLowerCase().includes(needle) || ticket.requester.toLowerCase().includes(needle)));
  const id = shown.find((ticket) => ticket.id === chosen)?.id ?? shown[0]?.id;
  const thread = useLoad(() => id ? call<Thread>("GET", `/admin/support/tickets/${id}`) : Promise.resolve(undefined), [id, tick]);
  const { error, run } = useAction();
  const open = thread.value?.ticket;

  function change(body: { status?: string; assignee?: string }) {
    if (!open) return;

    void run(async () => {
      await call("PUT", `/admin/support/tickets/${open.id}`, body);
      list.reload();
      thread.reload();
      onChange();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <input className={inputClass} placeholder={t("dash.tickets.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap items-center gap-1.5">
          {statuses.map((name) => <Button key={name || "all"} small kind={status === name ? "primary" : "ghost"} onClick={() => setStatus(name)}>{name ? t(`dash.tickets.status.${name}` as TextKey) : t("dash.acc.all")}</Button>)}
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-(--text-washed)"><input type="checkbox" checked={mine} onChange={(event) => setMine(event.target.checked)} />{t("dash.support.mine")}</label>
        </div>

        {shown.length === 0 && <Empty>{t("dash.tickets.none")}</Empty>}

        <div className="flex flex-col gap-1.5">
          {shown.map((ticket) => (
            <button key={ticket.id} type="button" onClick={() => setChosen(ticket.id)} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${id === ticket.id ? "border-(--border-raised) bg-(--background-raised)" : "border-(--border-surface) bg-(--background-surface) hover:bg-(--background-panel)"}`}>
              <Avatar name={ticket.requester || "?"} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm"><span className="truncate font-semibold">{ticket.subject}</span><Pill tone={tone[ticket.status]}>{t(`dash.tickets.status.${ticket.status}` as TextKey)}</Pill></span>
                <span className="block text-xs text-(--text-washed)">{ticket.requester} · {t(`support.cat.${ticket.category}` as TextKey)}</span>
                <span className="text-xs text-(--text-dark)">{ago(ticket.updatedAt, lang)} · {ticket.messages}{ticket.assignee ? ` · ${ticket.assignee}` : ""}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {open && thread.value && (
        <Card className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={open.requester || "?"} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{open.subject}</p>
              <p className="text-xs text-(--text-dark)">{open.requester} · {t(`support.cat.${open.category}` as TextKey)} · {new Date(open.createdAt).toLocaleString(lang)}</p>
            </div>
            <Pill tone={tone[open.status]}>{t(`dash.tickets.status.${open.status}` as TextKey)}</Pill>
            {open.assignee && <Pill tone="violet">{open.assignee}</Pill>}
          </div>

          <div className="flex flex-wrap gap-2">
            {open.assignee !== me.username && <Button small kind="ghost" onClick={() => change({ assignee: "me" })}>{t("dash.support.take")}</Button>}
            {open.status !== "closed" && <Button small kind="primary" onClick={() => change({ status: "closed" })}>{t("dash.tickets.close")}</Button>}
            {open.status === "closed" && <Button small kind="ghost" onClick={() => change({ status: "open" })}>{t("dash.tickets.reopen")}</Button>}
          </div>

          <div className="flex flex-col gap-3">
            {thread.value.messages.map((message) => (
              <div key={message.id} className={`flex flex-col gap-1 rounded-xl border px-4 py-3 ${message.internal ? "border-[#ffb86b]/30 bg-[#ffb86b]/8" : message.staff ? "border-(--brand)/40 bg-(--accent-muted)" : "border-(--border-surface) bg-(--background-dark)"}`}>
                <p className="flex items-center gap-2 text-xs text-(--text-dark)"><span className="font-semibold text-(--text-default)">{message.author}</span>{message.internal && <Pill tone="orange">{t("dash.tickets.internal")}</Pill>}{new Date(message.createdAt).toLocaleString(lang)}</p>
                <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
              </div>
            ))}
          </div>

          {open.status !== "closed" && (
            <form className="flex flex-col gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { await call("POST", `/admin/support/tickets/${open.id}/messages`, { body: text, internal }); setText(""); list.reload(); thread.reload(); onChange(); }); }}>
              <Templates onPick={(body) => setText(text ? `${text}\n${body}` : body)} />
              <textarea rows={4} maxLength={4000} value={text} placeholder={internal ? t("dash.tickets.internalPlaceholder") : t("dash.tickets.replyPlaceholder")} className={`${inputClass} resize-none ${internal ? "!border-[#ffb86b]/50" : ""}`} onChange={(event) => setText(event.target.value)} />
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-(--text-washed)"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} />{t("dash.tickets.internalNote")}</label>
                <span className="ml-auto"><Button type="submit" disabled={!text.trim()}>{internal ? t("dash.notes.save") : t("dash.tickets.send")}</Button></span>
              </div>
            </form>
          )}
          <ErrorLine error={error} />

          <div>
            <Heading>{t("dash.acct.manage")} · {open.requester}</Heading>
            <AccountManager accountId={open.requesterId} me={me} />
          </div>
        </Card>
      )}
    </div>
  );
}
