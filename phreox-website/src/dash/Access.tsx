import { useEffect, useState } from "react";
import { call } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { refreshData, useData } from "./data.ts";
import { Dialog, useOverlays, useRun } from "./overlay.tsx";
import type { Intent, Row } from "./types.ts";
import { Avatar, Button, CopyButton, Empty, ErrorLine, Field, inputClass, Panel, Pill, SearchField, Skeleton, type Tone } from "./ui.tsx";

type RegToken = { id: string; createdBy: string; note: string; maxUses: number; uses: number; expiresAt: number; revoked: boolean; createdAt: number };
type CreatedToken = { id: string; token: string; maxUses: number; expiresAt: number; note: string };
type XboxLink = { state: "unavailable" | "unlinked" | "pending" | "linked" | "failed"; gamertag: string | null; userCode: string | null; verificationUri: string | null };

const ttlOptions: { seconds: number; key: TextKey }[] = [
  { seconds: 0, key: "dash.tok.never" },
  { seconds: 86400, key: "dash.tok.day" },
  { seconds: 604800, key: "dash.tok.week" },
  { seconds: 2592000, key: "dash.tok.month" },
];

function statusOf(token: RegToken): [TextKey, Tone] {
  if (token.revoked) return ["dash.tok.status.revoked", "red"];
  if (token.expiresAt && Date.now() >= token.expiresAt) return ["dash.tok.status.expired", "grey"];
  if (token.uses >= token.maxUses) return ["dash.tok.status.used", "grey"];

  return ["dash.tok.status.active", "green"];
}

/** Makes a token; it is shown once, in the same dialog, to be copied. */
function NewToken({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [maxUses, setMaxUses] = useState(1);
  const [ttl, setTtl] = useState(604800);
  const [note, setNote] = useState("");
  const [created, setCreated] = useState<CreatedToken>();
  const { busy, run } = useRun();

  const create = () => void run(async () => {
    setCreated(await call<CreatedToken>("POST", "/admin/registration-tokens", { maxUses, ttlSeconds: ttl, note }));
    refreshData("/admin/registration-tokens");
  });

  if (created) {
    return (
      <Dialog size="md" title={t("dash.tok.readyTitle")} description={t("dash.tok.created")} onClose={onClose} footer={<Button onClick={onClose}>{t("dash.done")}</Button>}>
        <div className="flex items-center gap-2 rounded-xl border border-(--border-panel) bg-(--background-dark) p-3">
          <code className="min-w-0 flex-1 select-all break-all text-sm">{created.token}</code>
          <CopyButton text={created.token} small={false} />
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog size="md" title={t("dash.tok.create")} description={t("dash.tok.hint")} onClose={onClose} footer={<>
      <Button kind="ghost" onClick={onClose}>{t("common.cancel")}</Button>
      <Button busy={busy} disabled={maxUses < 1} onClick={create}>{t("dash.tok.create")}</Button>
    </>}>
      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); create(); }}>
        <Field label={t("dash.tok.note")}>
          <input data-autofocus className={inputClass} value={note} maxLength={120} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("dash.tok.maxUses")}>
            <input type="number" className={inputClass} min={1} max={10000} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} />
          </Field>
          <Field label={t("dash.tok.ttl")}>
            <select className={inputClass} value={ttl} onChange={(event) => setTtl(Number(event.target.value))}>
              {ttlOptions.map((option) => <option key={option.seconds} value={option.seconds}>{t(option.key)}</option>)}
            </select>
          </Field>
        </div>
      </form>
    </Dialog>
  );
}

function Tokens({ tick, intent, done }: { tick: number; intent?: Intent; done: () => void }) {
  const { t, lang } = useT();
  const { ask } = useOverlays();
  const tokens = useData<RegToken[]>("/admin/registration-tokens", tick);
  const [creating, setCreating] = useState(false);
  const { run } = useRun();

  useEffect(() => {
    if (intent === "new-token") {
      setCreating(true);
      done();
    }
  }, [intent, done]);

  const revoke = async (token: RegToken) => {
    if (!await ask({ title: t("dash.tok.confirmRevoke"), text: token.note || undefined, confirm: t("dash.tok.revoke"), danger: true })) return;

    void run(async () => {
      await call("DELETE", `/admin/registration-tokens/${token.id}`);
      refreshData("/admin/registration-tokens");
    }, t("dash.tok.revoked"));
  };

  return (
    <Panel flush title={t("dash.tok.title")} hint={t("dash.tok.hint")} action={<Button onClick={() => setCreating(true)}>{t("dash.tok.create")}</Button>}>
      <ErrorLine error={tokens.error} />
      {tokens.loading && <div className="px-5 pb-5"><Skeleton /></div>}
      {tokens.value?.length === 0 && <p className="px-5 pb-5 text-sm text-(--text-dark)">{t("dash.tok.none")}</p>}
      <ul className="flex flex-col divide-y divide-(--border-surface) border-t border-(--border-surface) empty:hidden">
        {tokens.value?.map((token) => {
          const [status, tone] = statusOf(token);

          return (
            <li key={token.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{token.note || t("dash.tok.noNote")}</p>
                <p className="text-xs text-(--text-dark)">{t("dash.tok.line", { date: new Date(token.createdAt).toLocaleDateString(lang), until: token.expiresAt ? new Date(token.expiresAt).toLocaleDateString(lang) : t("dash.tok.never") })}</p>
              </div>
              <span className="text-sm tabular-nums text-(--text-washed)">{t("dash.tok.uses", { used: token.uses, max: token.maxUses })}</span>
              <Pill tone={tone}>{t(status)}</Pill>
              <span className="w-24 text-right">{status === "dash.tok.status.active" && <Button kind="danger" small onClick={() => void revoke(token)}>{t("dash.tok.revoke")}</Button>}</span>
            </li>
          );
        })}
      </ul>
      {creating && <NewToken onClose={() => setCreating(false)} />}
    </Panel>
  );
}

function Testers({ tick }: { tick: number }) {
  const { t } = useT();
  const everyone = useData<Row[]>("/admin/accounts?query=", tick);
  const [query, setQuery] = useState("");
  const { busy, run } = useRun();
  const needle = query.trim().toLowerCase();
  const testers = (everyone.value ?? []).filter((row) => (row.badges ?? []).includes("tester"));
  const found = needle.length < 2 ? [] : (everyone.value ?? []).filter((row) => !(row.badges ?? []).includes("tester") && row.username.toLowerCase().includes(needle)).slice(0, 6);

  const set = (row: Row, on: boolean) => void run(async () => {
    await call(on ? "PUT" : "DELETE", `/admin/accounts/${row.id}/badges/tester`);
    refreshData("/admin/accounts");
  }, t(on ? "dash.tester.made" : "dash.tester.removed", { name: row.username }));

  return (
    <Panel title={t("dash.tester.title")} hint={t("dash.tester.hint")}>
      <div className="flex flex-col gap-4">
        <SearchField placeholder={t("dash.tester.search")} value={query} onChange={setQuery} />
        {found.length > 0 && (
          <ul className="flex flex-col gap-1">
            {found.map((row) => (
              <li key={row.id} className="flex items-center gap-3 rounded-xl bg-(--background-dark) px-3 py-2">
                <Avatar name={row.username} size={24} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.username}</span>
                <Button small busy={busy} onClick={() => set(row, true)}>{t("dash.tester.make")}</Button>
              </li>
            ))}
          </ul>
        )}
        {needle.length >= 2 && found.length === 0 && <p className="text-sm text-(--text-dark)">{t("dash.tester.noMatch")}</p>}

        <div>
          <h3 className="mb-2 text-sm font-medium text-(--text-washed)">{t("dash.tester.list")} <span className="tabular-nums text-(--text-dark)">{testers.length}</span></h3>
          {testers.length === 0 && <p className="text-sm text-(--text-dark)">{t("dash.tester.none")}</p>}
          <ul className="flex flex-wrap gap-2">
            {testers.map((row) => (
              <li key={row.id} className="flex items-center gap-2 rounded-full border border-(--border-panel) py-1 pr-1 pl-1.5 text-sm">
                <Avatar name={row.username} size={20} />
                {row.username}
                <button type="button" aria-label={`${t("dash.tester.remove")}: ${row.username}`} disabled={busy} className="grid size-5 cursor-pointer place-items-center rounded-full text-(--text-dark) hover:bg-[#ee0333]/20 hover:text-[#ff7a93]" onClick={() => set(row, false)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
}

/**
 * The Xbox account of Phreox. Xbox tells what a profile plays only to a signed-in account, so the service has one: it is linked here
 * once, with a code that is entered at Microsoft, and from then on the service looks up what the Gamertag of a member plays.
 */
function Xbox({ tick }: { tick: number }) {
  const { t } = useT();
  const { ask } = useOverlays();
  const [poll, setPoll] = useState(0);
  const link = useData<XboxLink>("/admin/xbox", tick + poll);
  const { busy, run } = useRun();
  const state = link.value?.state;

  // While the code waits to be entered, the state is read again every few seconds.
  useEffect(() => {
    if (state !== "pending") return;

    const timer = window.setTimeout(() => setPoll((count) => count + 1), 3000);

    return () => window.clearTimeout(timer);
  }, [state, poll]);

  const start = () => void run(async () => {
    await call<XboxLink>("POST", "/admin/xbox");
    link.reload();
  });

  const drop = async () => {
    if (state === "linked" && !await ask({ title: t("dash.xbox.unlinkTitle"), text: t("dash.xbox.confirmUnlink"), confirm: t("dash.xbox.unlink"), danger: true })) return;

    void run(async () => {
      await call("DELETE", "/admin/xbox");
      link.reload();
    });
  };

  const tone: Tone = state === "linked" ? "green" : state === "failed" ? "red" : state === "pending" ? "orange" : "grey";

  return (
    <Panel title={t("dash.xbox.title")} hint={t("dash.xbox.hint")} action={state && <Pill tone={tone}>{t(`dash.xbox.state.${state}` as TextKey)}</Pill>}>
      <div className="flex flex-col gap-4">
        <ErrorLine error={link.error} />
        {state === "unavailable" && <p className="text-sm text-(--text-washed)">{t("dash.xbox.unavailable")}</p>}
        {state === "linked" && <p className="text-sm">{t("dash.xbox.linked")} <span className="font-semibold">{link.value?.gamertag}</span></p>}
        {state === "failed" && <p role="alert" className="text-sm text-[#ff7a93]">{t("dash.xbox.failed")}</p>}

        <div className="flex flex-wrap gap-2">
          {(state === "unlinked" || state === "failed") && <Button busy={busy} onClick={start}>{t("dash.xbox.link")}</Button>}
          {state === "linked" && <Button kind="ghost" busy={busy} onClick={start}>{t("dash.xbox.relink")}</Button>}
          {state === "linked" && <Button kind="danger" onClick={() => void drop()}>{t("dash.xbox.unlink")}</Button>}
        </div>
      </div>

      {state === "pending" && link.value && (
        <Dialog size="sm" title={t("dash.xbox.codeTitle")} description={t("dash.xbox.enterCode")} onClose={() => void drop()} footer={<>
          <Button kind="ghost" onClick={() => void drop()}>{t("dash.xbox.cancel")}</Button>
          <a className="btn btn-primary" href={link.value.verificationUri ?? "#"} target="_blank" rel="noopener noreferrer">{t("dash.xbox.open")}</a>
        </>}>
          <div className="flex flex-col items-center gap-3 rounded-xl bg-(--background-dark) px-4 py-5">
            <code className="display select-all text-4xl tracking-[0.18em]">{link.value.userCode}</code>
            <CopyButton text={link.value.userCode ?? ""} />
            <p className="flex items-center gap-2 text-xs text-(--text-dark)"><span aria-hidden className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />{t("dash.xbox.waiting")}</p>
          </div>
        </Dialog>
      )}
    </Panel>
  );
}

/** Who gets in and who tests: the tokens for new accounts, the testers, and the Xbox account of the service. */
export function Access({ tick, intent, done }: { tick: number; intent?: Intent; done: () => void }) {
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Tokens tick={tick} intent={intent} done={done} />
      <div className="flex flex-col gap-4">
        <Testers tick={tick} />
        <Xbox tick={tick} />
      </div>
    </div>
  );
}
