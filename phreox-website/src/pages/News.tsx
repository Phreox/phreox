import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Markdown } from "@app/components/Markdown.tsx";
import { call, type NewsPost, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
import { Glow, InView } from "../components/InView.tsx";
import { type TextKey, useT } from "../i18n.ts";

const catColors: Record<string, string> = {
  release: "bg-[#5865f2] text-white",
  update: "bg-[#3ba55d] text-white",
  community: "bg-[#eb459f] text-white",
  maintenance: "bg-[#f0a020] text-white",
  announcement: "bg-[#7a5af8] text-white",
};

function Meta({ post }: { post: NewsPost }) {
  const { t, lang } = useT();
  const badge = catColors[post.category] ?? "bg-(--paper) text-(--text-washed)";

  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-(--text-dark)">
      {post.pinned && <span className="flex items-center gap-1 font-semibold text-amber-600"><Icon name="pin" className="size-3.5" />{t("news.pinned")}</span>}
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge}`}>{t(`cat.${post.category}` as TextKey)}</span>
      <time dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })}</time>
      <span className="font-medium">{post.author}</span>
    </p>
  );
}

export function NewsList() {
  const { t, lang } = useT();
  const { value, error } = useLoad(() => call<NewsPost[]>("GET", "/news"));
  const [cat, setCat] = useState("all");
  const de = lang === "de";

  const categories = [
    { id: "all", label: de ? "Alle Beiträge" : "All posts" },
    { id: "release", label: "Release" },
    { id: "update", label: "Update" },
    { id: "community", label: "Community" },
  ];

  const filtered = useMemo(() => {
    if (!value) return [];
    if (cat === "all") return value;
    return value.filter((post) => post.category === cat);
  }, [value, cat]);

  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 sm:pt-24">
      <InView>
        <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">{t("news.title")}</h1>
        <p className="mt-4 text-lg text-(--text-washed)">{t("news.text")}</p>
      </InView>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${cat === c.id ? "bg-(--violet) text-white" : "bg-(--paper) text-(--text-washed) hover:text-(--ink)"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-10 text-red-600">{t("common.error")}</p>}
      {!value && !error && (
        <div className="mt-10 flex flex-col gap-4">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      )}
      {value && filtered.length === 0 && <p className="mt-10 text-(--text-washed)">{t("news.empty")}</p>}

      <ul className="mt-8 divide-y divide-black/10 border-y border-black/10">
        {filtered.map((post, index) => (
          <InView as="li" key={post.id} delay={index * 60}>
            <div className="py-8 transition-colors hover:bg-black/[0.015]">
              <Meta post={post} />
              <h2 className="display mt-3 text-3xl sm:text-5xl">
                <Link to={`/news/${post.id}`} className="transition-colors hover:text-(--violet-deep)">{post.title}</Link>
              </h2>
              <p className="mt-3 max-w-3xl text-(--text-washed) line-clamp-3">{post.body.replace(/[*_~`>|#]/g, "")}</p>
              <div className="mt-4">
                <Link to={`/news/${post.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--violet) hover:underline">
                  {de ? "Weiterlesen" : "Read more"} →
                </Link>
              </div>
            </div>
          </InView>
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
    <article className="mx-auto max-w-4xl px-5 pt-14 pb-20 sm:pt-20">
      <Link to="/news" className="font-semibold text-(--violet-deep) hover:underline">← {t("news.back")}</Link>

      {error && <p role="alert" className="mt-8 text-red-600">{error}</p>}
      {!value && !error && <div className="skeleton mt-8 h-80" />}

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
