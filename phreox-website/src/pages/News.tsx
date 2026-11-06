import { Link, useParams } from "react-router";
import { Markdown } from "@app/components/Markdown.tsx";
import { call, type NewsPost, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

export function Post({ post, linked = false }: { post: NewsPost; linked?: boolean }) {
  const { t, lang } = useT();

  return (
    <article className="glass rounded-3xl p-7 sm:p-9">
      <div className="flex items-center gap-2 text-xs text-(--text-dark)">
        {post.pinned && <Icon name="pin" className="size-3.5 text-(--accent)" />}
        <span className="px-2.5 py-1 rounded-full bg-white/8 text-(--text-washed)">{t(`cat.${post.category}` as TextKey)}</span>
        <time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleString(lang)}</time>
        <span>· {post.author}</span>
      </div>

      <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight">{linked ? <Link to={`/news/${post.id}`} className="hover:text-(--accent) transition-colors">{post.title}</Link> : post.title}</h2>

      <div className="mt-4 text-(--text-washed) leading-relaxed"><Markdown source={post.body} /></div>
    </article>
  );
}

export function NewsList() {
  const { t } = useT();
  const { value, error } = useLoad(() => call<NewsPost[]>("GET", "/news"));

  return (
    <section className="mx-auto max-w-3xl px-4 pt-20">
      <Reveal className="text-center mb-12">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">{t("news.title")}</h1>
        <p className="mt-3 text-(--text-washed)">{t("news.text")}</p>
      </Reveal>

      {error && <p className="text-center text-sm text-red-400">{t("common.error")}</p>}
      {value?.length === 0 && <p className="text-center text-(--text-washed)">{t("news.empty")}</p>}

      <div className="flex flex-col gap-5">
        {value?.map((post, index) => (
          <Reveal key={post.id} delay={Math.min(index, 4) * 60}>
            <Post post={post} linked />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function NewsPage() {
  const { t } = useT();
  const { id } = useParams();
  const { value, error } = useLoad(() => call<NewsPost>("GET", `/news/${id}`), [id]);

  return (
    <section className="mx-auto max-w-3xl px-4 pt-16">
      <Link to="/news" className="text-sm text-(--accent) hover:underline">← {t("news.back")}</Link>

      <div className="mt-6">
        {error && <p className="text-sm text-red-400">{error}</p>}
        {value && <Post post={value} />}
      </div>
    </section>
  );
}
