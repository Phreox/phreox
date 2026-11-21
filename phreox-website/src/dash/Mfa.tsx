import { useState } from "react";
import { call } from "../api.ts";
import { useT } from "../i18n.ts";
import { CodeInput, useRun } from "./overlay.tsx";
import { Button, CopyButton } from "./ui.tsx";

/** The frame of the two steps of the second factor: one calm surface in the middle, nothing else to look at. */
function Gate({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center px-2">
      <div className="dash-dialog w-full max-w-md rounded-2xl border border-(--border-panel) bg-(--background-surface) p-6 text-center sm:p-8">
        <span aria-hidden className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-(--brand)/20 text-(--accent)">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
        </span>
        <h2 className="display text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-[38ch] text-sm text-(--text-washed)">{text}</p>
        <div className="mt-6 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

/** Asks for the code of the authenticator; the session is open for a while after it. */
export function Verify({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [code, setCode] = useState("");
  const { busy, run } = useRun();

  const send = (value: string) => void run(async () => {
    await call("POST", "/admin/mfa/verify", { code: value });
    onDone();
  }).then((ok) => ok || setCode(""));

  return (
    <Gate title={t("dash.mfa.verifyTitle")} text={t("dash.mfa.verifyText")}>
      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (code.length === 6) send(code); }}>
        <CodeInput autoFocus value={code} onChange={setCode} onComplete={send} />
        <Button type="submit" busy={busy} disabled={code.length !== 6}>{t("dash.mfa.verify")}</Button>
      </form>
    </Gate>
  );
}

/** The first time: a secret for the authenticator app, confirmed with its first code. */
export function Setup({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const [setup, setSetup] = useState<{ secret: string; uri: string }>();
  const [code, setCode] = useState("");
  const { busy, run } = useRun();

  const enable = (value: string) => void run(async () => {
    await call("POST", "/admin/mfa/enable", { code: value });
    onDone();
  }).then((ok) => ok || setCode(""));

  return (
    <Gate title={t("dash.mfa.setupTitle")} text={t("dash.mfa.setupText")}>
      {!setup
        ? <Button busy={busy} onClick={() => void run(async () => setSetup(await call("POST", "/admin/mfa/setup")))}>{t("dash.mfa.create")}</Button>
        : (
          <form className="flex flex-col gap-4 text-left" onSubmit={(event) => { event.preventDefault(); if (code.length === 6) enable(code); }}>
            <div>
              <p className="text-xs text-(--text-dark)">{t("dash.mfa.secret")}</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 select-all break-all rounded-xl bg-(--background-dark) px-3 py-2 text-base tracking-widest">{setup.secret}</code>
                <CopyButton text={setup.secret} />
              </div>
              <a className="mt-2 inline-block text-xs text-(--accent) hover:underline" href={setup.uri}>{t("dash.mfa.uri")}</a>
            </div>
            <p className="text-center text-sm text-(--text-washed)">{t("dash.mfa.confirm")}</p>
            <CodeInput autoFocus value={code} onChange={setCode} onComplete={enable} />
            <Button type="submit" busy={busy} disabled={code.length !== 6}>{t("dash.mfa.enable")}</Button>
          </form>
        )}
    </Gate>
  );
}
