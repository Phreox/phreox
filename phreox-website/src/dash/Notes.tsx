import { useState } from "react";
import { call, useLoad } from "../api.ts";
import { useT } from "../i18n.ts";
import { Button, ErrorLine, inputClass, useAction } from "./ui.tsx";

type Note = { id: string; author: string; body: string; createdAt: number };

/** What the team wrote down about an account. Only the team sees it. */
export function Notes({ accountId, me }: { accountId: string; me: string }) {
  const { t, lang } = useT();
  const notes = useLoad(() => call<Note[]>("GET", `/admin/support/notes/${accountId}`), [accountId]);
  const [text, setText] = useState("");
  const { error, run } = useAction();

  return (
    <div className="flex flex-col gap-3">
      {notes.value?.length === 0 && <p className="text-sm text-(--text-dark)">{t("dash.notes.none")}</p>}

      {notes.value?.map((note) => (
        <div key={note.id} className="rounded-xl border border-[#ffb86b]/25 bg-[#ffb86b]/8 px-3 py-2 text-sm">
          <p className="flex items-center gap-2 text-xs text-(--text-dark)">
            <span className="font-semibold text-(--text-default)">{note.author}</span>{new Date(note.createdAt).toLocaleString(lang)}
            {note.author === me && <button type="button" className="ml-auto cursor-pointer text-[#ff7a93] hover:underline" onClick={() => void run(async () => { await call("DELETE", `/admin/support/note/${note.id}`); notes.reload(); })}>{t("common.delete")}</button>}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words">{note.body}</p>
        </div>
      ))}

      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void run(async () => { await call("POST", `/admin/support/notes/${accountId}`, { body: text }); setText(""); notes.reload(); }); }}>
        <input className={inputClass} value={text} maxLength={2000} placeholder={t("dash.notes.add")} onChange={(event) => setText(event.target.value)} />
        <Button type="submit" disabled={!text.trim()}>{t("dash.notes.save")}</Button>
      </form>
      <ErrorLine error={error} />
    </div>
  );
}
