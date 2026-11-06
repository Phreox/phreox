import { Link, useParams } from "react-router";
import { Markdown } from "@app/components/Markdown.tsx";
import { call, type NewsPost, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
import { type TextKey, useT } from "../i18n.ts";

function Meta({ post }: { post: NewsPost }) {
  const { t, lang } = useT();

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-dark)">
      {post.pinned && <span className="flex items-center gap-1 text-(--volt)"><Icon name="pin" className="size-3.5" />{t("news.pinned")}</span>}
      <span className="rounded-md bg-white/8 px-2 py-0.5 text-(--text-washed)">{t(`cat.${post.category}` as TextKey)}</span>
      <time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })}</time>
      <span>{post.author}</span>
    </p>
  );
}

export function NewsList() {
  const { t } = useT();
  const { value, error } = useLoad(() => call<NewsPost[]>("GET", "/news"));

  return (
    <section className="mx-auto max-w-4xl px-5 pt-16 sm:pt-24">
      <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">{t("news.title")}</h1>
      <p className="mt-4 text-lg text-(--text-washed)">{t("news.text")}</p>

      {error && <p role="alert" className="mt-10 text-red-400">{t("common.error")}</p>}
      {value?.length === 0 && <p className="mt-10 text-(--text-washed)">{t("news.empty")}</p>}

      <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {value?.map((post) => (
          <li key={post.id} className="py-8">
            <Meta post={post} />
            <h2 className="display mt-3 text-3xl sm:text-5xl"><Link to={`/news/${post.id}`} className="transition-colors hover:text-(--lilac)">{post.title}</Link></h2>
            <p className="mt-3 max-w-2xl text-(--text-washed) line-clamp-3">{post.body.replace(/[*_~`>|#]/g, "")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewsPage() {
  const { t } = useT();
  const { id } = useParams();
  const { value, error } = useLoad(() => call<NewsPost>("GET", `/news/${id}`), [id]);

  return (
    <article className="mx-auto max-w-3xl px-5 pt-14 sm:pt-20">
      <Link to="/news" className="font-semibold text-(--lilac) hover:underline">← {t("news.back")}</Link>

      {error && <p role="alert" className="mt-8 text-red-400">{error}</p>}

      {value && (
        <>
          <div className="mt-8"><Meta post={value} /></div>
          <h1 className="display mt-4 text-[clamp(2.6rem,7vw,5rem)]">{value.title}</h1>
          <div className="mt-8 text-lg leading-relaxed text-(--text-washed)"><Markdown source={value.body} /></div>
        </>
      )}
    </article>
  );
}
