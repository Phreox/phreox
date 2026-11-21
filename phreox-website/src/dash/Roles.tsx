import { useEffect, useState } from "react";
import { call } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { refreshData, useData } from "./data.ts";
import { Dialog, useOverlays, useRun } from "./overlay.tsx";
import type { Catalog, Intent, Role } from "./types.ts";
import { Button, Chip, Empty, Field, inputClass, Skeleton } from "./ui.tsx";

function NewRole({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [name, setName] = useState("");
  const { busy, run } = useRun();

  const create = () => void run(async () => {
    await call("PUT", `/admin/roles/${encodeURIComponent(name)}`, { flags: [] });
    refreshData("/admin/roles");
    onClose();
  }, t("dash.roles.created", { name }));

  return (
    <Dialog size="sm" title={t("dash.roles.create")} description={t("dash.roles.hint")} onClose={onClose} footer={<>
      <Button kind="ghost" onClick={onClose}>{t("common.cancel")}</Button>
      <Button busy={busy} disabled={name.length < 2} onClick={create}>{t("dash.roles.create")}</Button>
    </>}>
      <form onSubmit={(event) => { event.preventDefault(); if (name.length >= 2) create(); }}>
        <Field label={t("dash.roles.name")} hint={t("dash.roles.nameHint")}>
          <input data-autofocus className={inputClass} value={name} maxLength={32} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} />
        </Field>
      </form>
    </Dialog>
  );
}

/** The roles: a name for a set of rights, to hand to accounts. */
export function Roles({ tick, intent, done }: { tick: number; intent?: Intent; done: () => void }) {
  const { t } = useT();
  const { ask } = useOverlays();
  const catalog = useData<Catalog>("/admin/catalog").value;
  const roles = useData<Role[]>("/admin/roles", tick);
  const [creating, setCreating] = useState(false);
  const { busy, run } = useRun();

  useEffect(() => {
    if (intent === "new-role") {
      setCreating(true);
      done();
    }
  }, [intent, done]);

  const save = (role: Role, flag: string) => void run(async () => {
    await call("PUT", `/admin/roles/${encodeURIComponent(role.name)}`, { flags: role.flags.includes(flag) ? role.flags.filter((item) => item !== flag) : [...role.flags, flag] });
    refreshData("/admin/roles");
  });

  const remove = async (role: Role) => {
    if (!await ask({ title: t("dash.roles.deleteTitle", { name: role.name }), text: t("dash.roles.deleteText"), confirm: t("common.delete"), danger: true })) return;

    void run(async () => {
      await call("DELETE", `/admin/roles/${encodeURIComponent(role.name)}`);
      refreshData("/admin/roles");
      refreshData("/admin/accounts");
    }, t("dash.roles.deleted", { name: role.name }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-[60ch] text-sm text-(--text-washed)">{t("dash.roles.hint")}</p>
        <span className="ml-auto"><Button onClick={() => setCreating(true)}>{t("dash.roles.create")}</Button></span>
      </div>

      {roles.loading && <Skeleton />}
      {roles.value?.length === 0 && <Empty action={<Button onClick={() => setCreating(true)}>{t("dash.roles.create")}</Button>}>{t("dash.roles.none")}</Empty>}

      <ul className="flex flex-col divide-y divide-(--border-surface) overflow-hidden rounded-2xl border border-(--border-surface) bg-(--background-surface) empty:hidden">
        {roles.value?.map((role) => (
          <li key={role.name} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
            <p className="w-40 shrink-0 truncate text-base font-semibold">{role.name}</p>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
              {catalog?.flags.map((flag) => <Chip key={flag} disabled={busy} on={role.flags.includes(flag)} onClick={() => save(role, flag)}>{t(`flag.${flag}` as TextKey)}</Chip>)}
            </div>
            <Button kind="danger" small onClick={() => void remove(role)}>{t("common.delete")}</Button>
          </li>
        ))}
      </ul>

      {creating && <NewRole onClose={() => setCreating(false)} />}
    </div>
  );
}
