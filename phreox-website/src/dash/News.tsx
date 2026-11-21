import { Markdown } from "@app/components/Markdown.tsx";
import { useEffect, useState } from "react";
import { call, type NewsPost } from "../api.ts";
import { type TextKey, useT } from "../i18n.ts";
import { refreshData, useData } from "./data.ts";
import { Dialog, useOverlays, useRun } from "./overlay.tsx";
import type { Catalog, Intent } from "./types.ts";
import { Button, Empty, ErrorLine, inputClass, Pill, Skeleton, Toggle } from "./ui.tsx";

/** Writes a post or changes one: the text at the left, how it will look at the right. */
function Editor({ post, onClose }: { post?: NewsPost; onClose: () => void }) {
  const { t } = useT();
  const { ask } = useOverlays();
  const catalog = useData<Catalog>("/admin/catalog").value;
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [category, setCategory] = useState(post?.category ?? "update");
  const [pinned, setPinned] = useState(post?.pinned ?? false);
  const { busy, run } = useRun();
  const changed = title !== (post?.title ?? "") || body !== (post?.body ?? "");

  // What was typed is not thrown away by a stray click or Escape.
  const close = async () => {
    if (!changed || await ask({ title: t("dash.news.discardTitle"), text: t("dash.news.discardText"), confirm: t("dash.news.discard"), danger: true })) onClose();
  };

  const save = () => void run(async () => {
    await call(post ? "PUT" : "POST", post ? `/news/${post.id}` : "/news", { title, body, category, pinned });
    refreshData("/news");
    onClose();
  }, t(post ? "dash.news.saved" : "dash.news.published"));

  return (
    <Dialog size="xl" title={post ? t("dash.news.editTitle") : t("dash.news.newTitle")} description={t("dash.news.sync")} onClose={() => void close()} footer={<>
      <span className="mr-auto"><Toggle on={pinned} onChange={setPinned}>{t("dash.news.pinned")}</Toggle></span>
      <Button kind="ghost" onClick={() => void close()}>{t("common.cancel")}</Button>
      <Button busy={busy} disabled={!title.trim() || !body.trim()} onClick={save}>{post ? t("dash.news.update") : t("dash.news.publish")}</Button>
    </>}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input data-autofocus className={inputClass} placeholder={t("dash.news.title")} aria-label={t("dash.news.title")} value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} />
            <select className={`${inputClass} !w-auto`} aria-label={t("dash.news.category")} value={category} onChange={(event) => setCategory(event.target.value)}>
              {(catalog?.categories ?? [category]).map((name) => <option key={name} value={name}>{t(`cat.${name}` as TextKey)}</option>)}
            </select>
          </div>
          <textarea className={`${inputClass} min-h-[26rem] flex-1 resize-y font-mono !text-[0.82rem] leading-relaxed`} placeholder={t("dash.news.body")} aria-label={t("dash.news.body")} value={body} maxLength={20000} onChange={(event) => setBody(event.target.value)} />
          <p className="text-right text-xs tabular-nums text-(--text-dark)">{body.length} / 20000</p>
        </div>
        <div className="min-h-[12rem] rounded-xl border border-(--border-surface) bg-(--background-dark) p-5">
          <p className="mb-3 text-xs text-(--text-dark)">{t("dash.news.preview")}</p>
          {title || body
            ? <><h3 className="text-xl font-bold">{title}</h3><div className="mt-3 text-(--text-washed)"><Markdown source={body} /></div></>
            : <p className="text-sm text-(--text-dark)">{t("dash.news.previewEmpty")}</p>}
        </div>
      </div>
    </Dialog>
  );
}

/** The posts of the news, the newest first; writing and changing happens in a dialog. */
export function News({ tick, intent, done }: { tick: number; intent?: Intent; done: () => void }) {
  const { t, lang } = useT();
  const { ask } = useOverlays();
  const posts = useData<NewsPost[]>("/news", tick);
  const [editing, setEditing] = useState<NewsPost | "new">();
  const { run } = useRun();

  useEffect(() => {
    if (intent === "new-post") {
      setEditing("new");
      done();
    }
  }, [intent, done]);

  const remove = async (post: NewsPost) => {
    if (!await ask({ title: t("dash.news.confirmDelete"), text: post.title, confirm: t("common.delete"), danger: true })) return;

    void run(async () => {
      await call("DELETE", `/news/${post.id}`);
      refreshData("/news");
    }, t("dash.news.deleted"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="max-w-[60ch] text-sm text-(--text-washed)">{t("dash.news.sync")}</p>
        <span className="ml-auto"><Button onClick={() => setEditing("new")}>{t("dash.news.write")}</Button></span>
      </div>

      <ErrorLine error={posts.error} />
      {posts.loading && <Skeleton rows={4} />}
      {posts.value?.length === 0 && <Empty action={<Button onClick={() => setEditing("new")}>{t("dash.news.write")}</Button>}>{t("dash.news.none")}</Empty>}

      <ul className="flex flex-col divide-y divide-(--border-surface) overflow-hidden rounded-2xl border border-(--border-surface) bg-(--background-surface) empty:hidden">
        {posts.value?.map((post) => (
          <li key={post.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate text-base font-semibold">{post.title}</span>
                <Pill>{t(`cat.${post.category}` as TextKey)}</Pill>
                {post.pinned && <Pill tone="orange">{t("dash.news.isPinned")}</Pill>}
              </p>
              <p className="mt-1 line-clamp-1 text-sm text-(--text-dark)">{post.body.replace(/[#*_>`[\]]/g, "").slice(0, 200)}</p>
            </div>
            <span className="text-xs whitespace-nowrap tabular-nums text-(--text-dark)">{post.author}, {new Date(post.createdAt).toLocaleDateString(lang)}</span>
            <span className="flex gap-2">
              <Button kind="ghost" small onClick={() => setEditing(post)}>{t("common.edit")}</Button>
              <Button kind="danger" small onClick={() => void remove(post)}>{t("common.delete")}</Button>
            </span>
          </li>
        ))}
      </ul>

      {editing && <Editor post={editing === "new" ? undefined : editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
