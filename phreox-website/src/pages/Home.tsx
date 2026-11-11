import { Link } from "react-router";
import { call, type Channel, type NewsPost, useLoad } from "../api.ts";
import { Glow, InView } from "../components/InView.tsx";
import { PlansTeaser } from "./Info.tsx";
import { Icon, type IconName } from "../components/Icons.tsx";
import { AppWindow, Ripples, RolesMock, VoiceMock, VoltMock } from "../components/Mock.tsx";
import { type TextKey, useT } from "../i18n.ts";

const names = { windows: "Windows", macos: "macOS", linux: "Linux", android: "Android" } as const;

/** The primary hero button: downloads the latest stable build for this system when there is one, otherwise it links to the download page. */
function HeroDownload() {
  const { t } = useT();
  const { value } = useLoad(() => call<Partial<Record<"release", Channel>>>("GET", "/releases"));
  const agent = navigator.userAgent;
  const own = /Android/i.test(agent) ? "android" : /Mac/i.test(agent) ? "macos" : /Win/i.test(agent) ? "windows" : "linux";
  const asset = value?.release?.assets.find((item) => item.platform === own);

  return (
    <Link to="/download" className="btn text-lg bg-[#23272f] text-white hover:bg-black">
      <Icon name={asset ? own : "download"} className="size-5" />
      {asset ? `${t("dl.get")} · ${names[own]}${value?.release ? ` ${value.release.version}` : ""}` : t("hero.ctaDownload")}
    </Link>
  );
}

const tones = {
  violet: "bg-(--violet) text-white",
  paper: "bg-(--paper) text-(--ink)",
  night: "bg-[#e3f4ff] text-(--ink)",
  volt: "bg-(--volt) text-(--ink)",
} as const;

/** One big panel: a heading with its explanation on one side and a picture of the app on the other. */
function Stage({ tone, title, text, points = [], flip = false, children }: { tone: keyof typeof tones; title: TextKey; text: TextKey; points?: TextKey[]; flip?: boolean; children: React.ReactNode }) {
  const { t } = useT();

  return (
    <InView as="section" className={`relative overflow-hidden rounded-[2rem] p-6 lift sm:rounded-[2.75rem] sm:p-10 lg:p-14 ${tones[tone]}`}>
      {tone === "night" && <Ripples className="pointer-events-none absolute -right-52 -bottom-52 w-[44rem] opacity-70" color="var(--violet)" />}

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

        <div className={`app-dark rounded-3xl ${flip ? "lg:order-1" : ""}`}>{children}</div>
      </div>
    </InView>
  );
}

function Latest() {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<NewsPost[]>("GET", "/news"));
  const posts = (value ?? []).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="mx-auto mt-28 max-w-[84rem] px-5">
      <div className="flex items-end justify-between gap-4">
        <h2 className="display text-[clamp(2.2rem,5vw,3.75rem)]">{t("news.latest")}</h2>
        <Link to="/news" className="font-semibold text-(--violet-deep) hover:underline">{t("news.more")}</Link>
      </div>

      <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {posts.map((post) => (
          <li key={post.id}>
            <Link to={`/news/${post.id}`} className="group grid gap-1 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <time className="text-sm text-(--text-dark) sm:pt-1.5" dateTime={new Date(post.createdAt).toISOString()}>{new Date(post.createdAt).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric" })}</time>
              <span>
                <span className="display block text-2xl transition-colors group-hover:text-(--violet-deep) sm:text-3xl">{post.title}</span>
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

const features: IconName[] = ["chat", "spaces", "roles", "voice", "bolt", "globe"];
const colors = ["#5865f2", "#eb459f", "#3ba55d", "#f0a020", "#7a5af8", "#0ea5e9"];

export function Home() {
  const { t } = useT();

  return (
    <>
      <section className="hero-bg relative overflow-hidden text-white">
        <Ripples className="pointer-events-none absolute -top-72 -right-72 w-[60rem] opacity-40 sm:-right-56" color="#fff" />
        <div className="float pointer-events-none absolute top-24 left-[6%] hidden size-16 rounded-full bg-(--volt) sm:block" style={{ ["--r" as string]: "0deg" }} />
        <div className="float pointer-events-none absolute top-1/2 right-[8%] hidden size-12 rotate-12 rounded-2xl bg-[#57f287] sm:block" style={{ ["--r" as string]: "12deg", animationDelay: "-2s" }} />
        <div className="float pointer-events-none absolute bottom-40 left-[3%] hidden size-10 rounded-xl bg-[#eb459f] sm:block" style={{ ["--r" as string]: "-10deg", animationDelay: "-4s" }} />

        <div className="relative mx-auto max-w-[84rem] px-5 pt-14 pb-24 sm:pt-24">
          <h1 className="display text-[clamp(3.6rem,11vw,9rem)]">
            {t("hero.title1")}<br /><span className="text-(--volt)">{t("hero.title2")}</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg text-white/90 sm:text-xl">{t("hero.text")}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="https://phreox.talk" className="btn btn-light text-lg">{t("hero.cta")}<Icon name="arrow" className="size-5" /></a>
            <HeroDownload />
          </div>
          <p className="mt-4 text-sm text-white/75">{t("hero.note")}</p>

          <div className="app-dark mt-14 rounded-3xl shadow-[0_50px_100px_-30px_rgb(0_0_0/0.55)]"><AppWindow /></div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-[84rem] px-5">
        <h2 className="display text-center text-[clamp(2.4rem,5.5vw,4.5rem)]">{t("feat.title")}</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((icon, index) => (
            <InView as="li" key={icon} delay={(index % 3) * 90}><Glow className="lift h-full rounded-3xl border border-black/10 bg-(--paper) p-7">
              <span className="flex size-14 items-center justify-center rounded-2xl text-white" style={{ background: colors[index] }}><Icon name={icon} className="size-8" /></span>
              <h3 className="display mt-5 text-3xl">{t(`feat.${index}.t` as TextKey)}</h3>
              <p className="mt-2 text-(--text-washed)">{t(`feat.${index}.d` as TextKey)}</p>
            </Glow></InView>
          ))}
        </ul>
      </section>

      <div className="mx-auto mt-28 flex max-w-[84rem] flex-col gap-6 px-5">
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

      <PlansTeaser />

      <Latest />

      <section className="mx-auto mt-28 grid max-w-[84rem] gap-10 px-5 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{t("where.title")}</h2>
          <p className="mt-5 max-w-[34rem] text-lg text-(--text-washed)">{t("where.text")}</p>
        </div>

        <ul className="divide-y divide-white/10 border-y border-white/10">
          {places.map((place) => {
            const inner = (
              <>
                <Icon name={place.icon} className="size-6 text-(--violet-deep)" />
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

      <section className="mx-auto mt-28 max-w-[84rem] px-5">
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
