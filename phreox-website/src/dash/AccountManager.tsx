import { useState } from "react";
import { call, type Me, useLoad } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { Notes } from "./Notes.tsx";
import { ago, Avatar, Button, ErrorLine, Heading, inputClass, Pill, type Tone, useAction } from "./ui.tsx";

export type Detail = { id: string; username: string; createdAt: number; profile: string | null; standing: "" | "suspended" | "banned"; standingUntil: number; standingReason: string; warnings: number };
type Sanction = { id: string; accountId: string; kind: "warn" | "suspend" | "ban" | "notice"; reason: string; detail: string; until: number; issuedBy: string; createdAt: number; revokedAt: number; revokedBy: string; active: boolean; acknowledged: boolean };

const tone: Record<Sanction["kind"], Tone> = { warn: "orange", suspend: "red", ban: "red", notice: "grey" };
const hours = [1, 6, 24, 72, 168, 720, 2160];
/** The fields of a profile the team may empty. */
const clearable = ["profilePicture", "bannerImage", "banner", "description", "customStatus", "links", "tags", "nameFont"] as const;

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function profileOf(text: string | null): Record<string, unknown> {
  try {
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function Moderation({ detail, me, reload }: { detail: Detail; me: Me; reload: () => void }) {
  const { t, lang } = useT();
  const history = useLoad(() => call<Sanction[]>("GET", `/admin/support/accounts/${detail.id}/sanctions`), [detail.id, detail.standing, detail.warnings]);
  const [kind, setKind] = useState<"warn" | "suspend" | "ban">("warn");
  const [duration, setDuration] = useState(24);
  const [reason, setReason] = useState("");
  const { error, run } = useAction();
  const isSuper = me.flags.includes("super-admin");
  const can = reason.trim().length >= 3;

  function issue() {
    if (kind !== "warn" && !confirm(t(kind === "ban" ? "dash.mod.confirmBan" : "dash.mod.confirmSuspend", { name: detail.username }))) return;

    void run(async () => {
      await call("POST", `/admin/support/accounts/${detail.id}/sanctions`, { kind, reason, hours: kind === "suspend" ? duration : undefined });
      setReason("");
      history.reload();
      reload();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-(--border-surface) bg-(--background-dark) p-4">
        <Row>
          {(["warn", "suspend", "ban"] as const).filter((name) => name !== "ban" || isSuper).map((name) => <Button key={name} small kind={kind === name ? (name === "warn" ? "primary" : "danger") : "ghost"} onClick={() => setKind(name)}>{t(`dash.mod.kind.${name}` as TextKey)}</Button>)}
          {kind === "suspend" && (
            <select className="field w-auto" aria-label={t("dash.mod.duration")} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {hours.map((count) => <option key={count} value={count}>{count < 24 ? t("dash.mod.hours", { n: count }) : t("dash.mod.days", { n: count / 24 })}</option>)}
            </select>
          )}
        </Row>
        <p className="text-xs text-(--text-dark)">{t(`dash.mod.hint.${kind}` as TextKey)}</p>
        <input className={inputClass} value={reason} maxLength={500} placeholder={t("dash.mod.reason")} onChange={(event) => setReason(event.target.value)} />
        <div className="flex items-center gap-3">
          <Button kind={kind === "warn" ? "primary" : "danger"} disabled={!can} onClick={issue}>{t(`dash.mod.do.${kind}` as TextKey)}</Button>
          <span className="text-xs text-(--text-dark)">{t("dash.mod.told")}</span>
        </div>
        <ErrorLine error={error} />
      </div>

      <div>
        <Heading>{t("dash.mod.history")}</Heading>
        {history.value?.length === 0 && <p className="text-sm text-(--text-dark)">{t("dash.mod.none")}</p>}
        <ul className="flex flex-col gap-2">
          {history.value?.map((sanction) => (
            <li key={sanction.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-(--border-surface) bg-(--background-dark) px-3 py-2 text-sm">
              <Pill tone={tone[sanction.kind]}>{t(`dash.mod.kind.${sanction.kind}` as TextKey)}</Pill>
              <span className="min-w-0 flex-1">
                <span className="block break-words">{sanction.reason || "–"}</span>
                {sanction.detail && <span className="block font-mono text-xs text-(--text-dark)">{sanction.detail}</span>}
                <span className="text-xs text-(--text-dark)">
                  {sanction.issuedBy} · {ago(sanction.createdAt, lang)}
                  {sanction.until > 0 && ` · ${t("dash.mod.until")} ${new Date(sanction.until).toLocaleString(lang)}`}
                  {sanction.kind === "warn" && ` · ${sanction.acknowledged ? t("dash.mod.read") : t("dash.mod.unread")}`}
                  {sanction.revokedAt > 0 && ` · ${t("dash.mod.lifted", { by: sanction.revokedBy })}`}
                </span>
              </span>
              {sanction.revokedAt === 0 && sanction.kind !== "notice" && (sanction.kind !== "ban" || isSuper) && (
                <Button small kind="ghost" onClick={() => void run(async () => { await call("POST", `/admin/support/sanctions/${sanction.id}/revoke`, {}); history.reload(); reload(); })}>{t("dash.mod.lift")}</Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProfileTab({ detail, reload }: { detail: Detail; reload: () => void }) {
  const { t } = useT();
  const profile = profileOf(detail.profile);
  const text = (key: string) => typeof profile[key] === "string" ? profile[key] as string : "";
  const [name, setName] = useState(detail.username);
  const [fields, setFields] = useState({ displayname: text("displayname"), description: text("description"), customStatus: text("customStatus") });
  const [reason, setReason] = useState("");
  const { error, run } = useAction();
  const can = reason.trim().length >= 3;
  const picture = text("profilePicture");

  function saveProfile(clear: string[] = []) {
    const set = Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== text(key) && !clear.includes(key)));

    void run(async () => {
      await call("PUT", `/admin/support/accounts/${detail.id}/profile`, { set, clear, reason });
      reload();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-xl border border-(--border-surface) bg-(--background-dark) p-4">
        <Heading>{t("dash.prof.username")}</Heading>
        <Row>
          <input className={`${inputClass} max-w-xs`} value={name} maxLength={32} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))} />
          <Button small disabled={!can || name.length < 3 || name === detail.username} onClick={() => void run(async () => { await call("PUT", `/admin/support/accounts/${detail.id}/username`, { username: name, reason }); reload(); })}>{t("dash.prof.rename")}</Button>
        </Row>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-(--border-surface) bg-(--background-dark) p-4">
        <Heading>{t("dash.prof.profile")}</Heading>
        {picture.startsWith("data:image/") && <img src={picture} alt="" className="size-16 rounded-full object-cover" />}
        <label className="flex flex-col gap-1 text-xs text-(--text-dark)">{t("dash.prof.displayname")}<input className={inputClass} value={fields.displayname} maxLength={64} onChange={(event) => setFields({ ...fields, displayname: event.target.value })} /></label>
        <label className="flex flex-col gap-1 text-xs text-(--text-dark)">{t("dash.prof.description")}<textarea rows={3} className={`${inputClass} resize-none`} value={fields.description} maxLength={2000} onChange={(event) => setFields({ ...fields, description: event.target.value })} /></label>
        <label className="flex flex-col gap-1 text-xs text-(--text-dark)">{t("dash.prof.status")}<input className={inputClass} value={fields.customStatus} maxLength={128} onChange={(event) => setFields({ ...fields, customStatus: event.target.value })} /></label>
        <Button small disabled={!can} onClick={() => saveProfile()}>{t("dash.prof.save")}</Button>

        <div>
          <p className="mb-2 text-xs text-(--text-dark)">{t("dash.prof.clear")}</p>
          <Row>{clearable.filter((key) => profile[key] !== undefined && profile[key] !== "" && !(Array.isArray(profile[key]) && (profile[key] as unknown[]).length === 0)).map((key) => <Button key={key} small kind="ghost" disabled={!can} onClick={() => saveProfile([key])}>{t(`notice.field.${key}` as TextKey)} ✕</Button>)}</Row>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <input className={inputClass} value={reason} maxLength={500} placeholder={t("dash.prof.reason")} onChange={(event) => setReason(event.target.value)} />
        <p className="text-xs text-(--text-dark)">{t("dash.mod.told")}</p>
        <ErrorLine error={error} />
      </div>
    </div>
  );
}

/** One account for the team: what was done about it, its name and profile, the notes about it. */
export function AccountManager({ accountId, me }: { accountId: string; me: Me }) {
  const { t, lang } = useT();
  const [tab, setTab] = useState<"mod" | "profile" | "notes">("mod");
  const detail = useLoad(() => call<Detail>("GET", `/admin/support/accounts/${accountId}`), [accountId]);
  const value = detail.value;

  if (!value) return <p className="text-sm text-(--text-dark)">{detail.error ?? t("common.loading")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar name={value.username} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{value.username}</p>
          <p className="font-mono text-xs text-(--text-dark)">{value.id}</p>
        </div>
        {value.standing === "banned" && <Pill tone="red">{t("dash.mod.banned")}</Pill>}
        {value.standing === "suspended" && <Pill tone="red">{t("dash.mod.suspendedUntil", { time: new Date(value.standingUntil).toLocaleString(lang) })}</Pill>}
        {value.warnings > 0 && <Pill tone="orange">{t("dash.mod.warnings", { n: value.warnings })}</Pill>}
      </div>
      {value.standing !== "" && <p className="rounded-xl bg-[#ee0333]/10 px-3 py-2 text-sm text-[#ff7a93]">{value.standingReason}</p>}

      <div className="flex gap-1.5">
        {(["mod", "profile", "notes"] as const).map((name) => <Button key={name} small kind={tab === name ? "primary" : "ghost"} onClick={() => setTab(name)}>{t(`dash.acct.${name}` as TextKey)}</Button>)}
      </div>

      {tab === "mod" && <Moderation detail={value} me={me} reload={detail.reload} />}
      {tab === "profile" && <ProfileTab key={`${value.username}${value.profile?.length}`} detail={value} reload={detail.reload} />}
      {tab === "notes" && <Notes accountId={value.id} me={me.username} />}
    </div>
  );
}
