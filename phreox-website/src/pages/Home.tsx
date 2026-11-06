import { Link } from "react-router";
import { call, type NewsPost, useLoad } from "../api.ts";
import { Icon, type IconName } from "../components/Icons.tsx";
import { AppWindow, Ripples, RolesMock, VoiceMock, VoltMock } from "../components/Mock.tsx";
import { type TextKey, useT } from "../i18n.ts";

const tones = {
  violet: "bg-(--violet) text-white",
  paper: "bg-(--paper) text-(--ink)",
  night: "bg-(--night) text-white ring-1 ring-white/8",
  volt: "bg-(--volt) text-(--ink)",
} as const;

/** One big panel: a heading with its explanation on one side and a picture of the app on the other. */
function Stage({ tone, title, text, points = [], flip = false, children }: { tone: keyof typeof tones; title: TextKey; text: TextKey; points?: TextKey[]; flip?: boolean; children: React.ReactNode }) {
  const { t } = useT();

  return (
    <section className={`relative overflow-hidden rounded-[2rem] p-6 sm:rounded-[2.75rem] sm:p-10 lg:p-14 ${tones[tone]}`}>
      {tone === "night" && <Ripples className="pointer-events-none absolute -right-52 -bottom-52 w-[44rem] opacity-70" color="var(--volt)" />}

      <div className="relative grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? "lg:order-2" : ""}>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{t(title)}</h2>
          <p className="mt-5 max-w-[34rem] text-lg opacity-90">{t(text)}</p>
          {points.length > 0 && (
            <ul className="mt-6 flex flex-col gap-2.5">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3"><Icon name="check" className="mt-1 size-4 shrink-0" />{t(point)}</li>
              ))}
            </ul>
          )}
        </div>

        <div className={flip ? "lg:order-1" : ""}>{children}</div>
      </div>
    </section>
  );
}

function Latest() {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<NewsPost[]>("GET", "/news"));
  const posts = (value ?? []).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="mx-auto mt-28 max-w-6xl px-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="display text-[clamp(2.2rem,5vw,3.75rem)]">{t("news.latest")}</h2>
        <Link to="/news" className="font-semibold text-(--lilac) hover:underline">{t("news.more")}</Link>
      </div>

      <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/news/${post.id}`} className="group grid gap-1 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <time className="text-sm text-(--text-dark) sm:pt-1.5" dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })}</time>
              <span>
                <span className="display block text-2xl transition-colors group-hover:text-(--lilac) sm:text-3xl">{post.title}</span>
                <span className="mt-2 block max-w-2xl text-(--text-washed) line-clamp-2">{post.body.replace(/[*_~`>|#]/g, "")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const places: { icon: IconName; name: TextKey | "browser"; to: string }[] = [
  { icon: "windows", name: "platform.windows", to: "/download" },
  { icon: "macos", name: "platform.macos", to: "/download" },
  { icon: "linux", name: "platform.linux", to: "/download" },
  { icon: "android", name: "platform.android", to: "/download" },
  { icon: "globe", name: "browser", to: "https://phreox.talk" },
];

export function Home() {
  const { t } = useT();

  return (
    <>
      <section className="relative overflow-hidden">
        <Ripples className="pointer-events-none absolute -top-72 -right-72 w-[60rem] opacity-60 sm:-right-56" />

        <div className="relative mx-auto max-w-6xl px-5 pt-14 sm:pt-24">
          <h1 className="display text-[clamp(3.6rem,11vw,9rem)]">
            {t("hero.title1")}<br /><span className="text-(--lilac)">{t("hero.title2")}</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-(--text-washed) sm:text-xl">{t("hero.text")}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="https://phreox.talk" className="btn btn-primary text-lg">{t("hero.cta")}<Icon name="arrow" className="size-5" /></a>
            <Link to="/download" className="btn btn-ghost text-lg"><Icon name="download" className="size-5" />{t("hero.ctaDownload")}</Link>
          </div>
          <p className="mt-4 text-sm text-(--text-dark)">{t("hero.note")}</p>

          <div className="mt-14"><AppWindow /></div>
        </div>
      </section>

      <div className="mx-auto mt-28 flex max-w-6xl flex-col gap-6 px-5">
        <Stage tone="violet" title="spaces.title" text="spaces.text" points={["spaces.p1", "spaces.p2", "spaces.p3"]}>
          <SpacesPicture />
        </Stage>

        <Stage tone="paper" title="roles.title" text="roles.text" points={["roles.free"]} flip>
          <RolesMock />
        </Stage>

        <Stage tone="night" title="voice.title" text="voice.text" points={["voice.p1", "voice.p2"]}>
          <VoiceMock />
        </Stage>

        <Stage tone="volt" title="volt.title" text="volt.text" flip>
          <VoltMock />
        </Stage>
      </div>

      <Latest />

      <section className="mx-auto mt-28 grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{t("where.title")}</h2>
          <p className="mt-5 max-w-[34rem] text-lg text-(--text-washed)">{t("where.text")}</p>
        </div>

        <ul className="divide-y divide-white/10 border-y border-white/10">
          {places.map((place) => {
            const inner = (
              <>
                <Icon name={place.icon} className="size-6 text-(--lilac)" />
                <span className="display flex-1 text-2xl">{place.name === "browser" ? t("nav.openApp") : t(place.name)}</span>
                <Icon name="arrow" className="size-5 opacity-0 transition-opacity group-hover:opacity-100" />
              </>
            );

            return (
              <li key={place.name}>
                {place.to.startsWith("http")
                  ? <a href={place.to} className="group flex items-center gap-4 py-4">{inner}</a>
                  : <Link to={place.to} className="group flex items-center gap-4 py-4">{inner}</Link>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto mt-28 max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-[2rem] bg-(--violet) p-8 sm:rounded-[3rem] sm:p-16">
          <Ripples className="pointer-events-none absolute -right-40 top-1/2 w-[40rem] -translate-y-1/2 opacity-60" color="#fff" />

          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="display text-[clamp(3rem,8vw,6.5rem)] text-white">{t("cta.title")}</h2>
              <p className="mt-4 max-w-md text-lg text-white/85">{t("cta.text")}</p>
              <a href="https://phreox.talk" className="btn btn-light mt-8 text-lg">{t("hero.cta")}<Icon name="arrow" className="size-5" /></a>
            </div>
            <img src="/phreox-logo.png" alt="" className="size-28 -rotate-6 rounded-[1.75rem] shadow-[0_20px_50px_-10px_rgb(0_0_0/0.5)] sm:size-44 sm:rounded-[2.5rem]" />
          </div>
        </div>
      </section>
    </>
  );
}

/** The channels of a space as a picture: categories, text and voice, a drag handle and the invite link. */
function SpacesPicture() {
  const rows: { icon: IconName; name: string; hint?: string }[][] = [
    [{ icon: "megaphone", name: "willkommen" }, { icon: "hash", name: "regeln" }],
    [{ icon: "hash", name: "allgemein" }, { icon: "hash", name: "projekte" }, { icon: "hash", name: "memes" }],
    [{ icon: "speaker", name: "Lounge", hint: "2" }, { icon: "speaker", name: "Zocken" }],
  ];
  const groups = ["Willkommen", "Chat", "Voice"];

  return (
    <div role="img" aria-label="Phreox: Channels in Kategorien" className="overflow-hidden rounded-3xl border border-(--border-panel) bg-(--background-dark) text-sm text-(--text-default) shadow-[0_40px_90px_-30px_rgb(0_0_0/0.6)]">
      <div className="flex h-28 items-end justify-between p-4" style={{ background: "linear-gradient(135deg, #5b34d6, #ff7a90)" }}>
        <span className="display text-3xl">BlueNet</span>
        <span className="rounded-lg bg-black/35 px-2.5 py-1 text-xs">phreox.talk/bluenet</span>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {rows.map((items, index) => (
          <div key={groups[index]} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1 text-xs font-semibold text-(--text-dark)">{groups[index]}</p>
            {items.map((item) => (
              <p key={item.name} className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${item.name === "projekte" ? "bg-(--background-raised) shadow-lg ring-1 ring-(--violet)" : "text-(--text-washed)"}`}>
                <span className="text-(--text-dark)" aria-hidden="true">⠿</span>
                <Icon name={item.icon} className="size-4 opacity-70" />{item.name}
                {item.hint && <span className="ml-auto rounded-full bg-(--background-raised) px-2 text-xs">{item.hint}</span>}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
