import { Link } from "react-router";
import { call, type NewsPost, useLoad } from "../api.ts";
import { Icon, type IconName } from "../components/Icons.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

const features: { icon: IconName; title: TextKey; text: TextKey; span: string; tint: string }[] = [
  { icon: "spaces", title: "f.spaces.title", text: "f.spaces.text", span: "md:col-span-2", tint: "from-[#835afc]/30" },
  { icon: "roles", title: "f.roles.title", text: "f.roles.text", span: "", tint: "from-[#ff6bb3]/25" },
  { icon: "voice", title: "f.voice.title", text: "f.voice.text", span: "", tint: "from-[#5fd4ff]/25" },
  { icon: "chat", title: "f.chat.title", text: "f.chat.text", span: "md:col-span-2", tint: "from-[#b39cff]/25" },
  { icon: "bolt", title: "f.ember.title", text: "f.ember.text", span: "", tint: "from-[#ffb86b]/25" },
  { icon: "open", title: "f.open.title", text: "f.open.text", span: "md:col-span-2", tint: "from-[#38b6a8]/25" },
];

/** The app, drawn with boxes: spaces on the left, channels, a chat and a voice channel. */
function AppMock() {
  const spaces = ["#835afc", "#ff6bb3", "#5fd4ff", "#ffb86b"];
  const lines = [
    { who: "Lena", color: "#ff6bb3", text: "Das neue Banner sieht mega aus 🔥" },
    { who: "Jonas", color: "#5fd4ff", text: "Hab die Rollen sortiert, Verläufe sind drin" },
    { who: "Mira", color: "#b39cff", text: "Wer ist gleich im Voice? **Release-Party** 🎉" },
  ];

  return (
    <div className="relative mx-auto mt-16 max-w-4xl" style={{ perspective: "1600px" }}>
      <div className="absolute -inset-6 rounded-[2rem] bg-linear-to-r from-[#835afc]/40 via-[#ff6bb3]/25 to-[#5fd4ff]/30 blur-3xl" />

      <div className="glass relative rounded-3xl overflow-hidden shadow-2xl shadow-black/60 flex h-[22rem] sm:h-[26rem]" style={{ transform: "rotateX(6deg)", transformOrigin: "center top" }}>
        <div className="w-14 sm:w-16 shrink-0 bg-black/30 flex flex-col items-center gap-3 py-4">
          {spaces.map((color, index) => (
            <span key={color} className={`size-9 sm:size-10 rounded-2xl grid place-items-center font-bold text-sm ${index === 0 ? "ring-2 ring-white/70" : "opacity-80"}`} style={{ background: color }}>{"BPNZ"[index]}</span>
          ))}
        </div>

        <div className="hidden sm:flex w-52 shrink-0 flex-col bg-black/20 p-3 gap-1 text-sm">
          <div className="h-20 -mx-3 -mt-3 mb-2 bg-linear-to-br from-[#835afc] to-[#ff6bb3] relative">
            <span className="absolute bottom-2 left-3 font-semibold">BlueNet</span>
          </div>
          {["willkommen", "ankündigungen", "allgemein", "projekte"].map((name, index) => (
            <span key={name} className={`px-2 py-1.5 rounded-lg text-(--text-washed) ${index === 2 ? "bg-white/10 text-white" : ""}`}># {name}</span>
          ))}
          <span className="px-2 pt-3 text-xs uppercase tracking-wider text-(--text-dark)">Voice</span>
          <span className="px-2 py-1.5 rounded-lg text-(--text-washed) flex items-center gap-2"><Icon name="voice" className="size-4" /> Lounge</span>
          <div className="flex -space-x-2 px-2">
            {["#ff6bb3", "#5fd4ff", "#ffb86b"].map((color) => <span key={color} className="size-6 rounded-full border-2 border-(--background-dark)" style={{ background: color, animation: "pulse-ring 2s ease-out infinite" }} />)}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 shrink-0 px-4 flex items-center border-b border-white/5 text-sm font-semibold"># allgemein</div>
          <div className="flex-1 p-4 flex flex-col gap-4 justify-end overflow-hidden">
            {lines.map((line) => (
              <div key={line.who} className="flex gap-3 items-start">
                <span className="size-9 rounded-full shrink-0" style={{ background: line.color }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: line.color }}>{line.who} <span className="text-xs text-(--text-dark) font-normal">heute</span></p>
                  <p className="text-sm text-(--text-washed)">{line.text}</p>
                </div>
              </div>
            ))}
            <div className="h-11 rounded-xl bg-white/6 border border-white/8 px-4 flex items-center text-sm text-(--text-dark)">Nachricht an #allgemein</div>
          </div>
        </div>
      </div>

      <span className="glass absolute -left-3 sm:-left-10 top-16 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2" style={{ animation: "float 6s ease-in-out infinite" }}>
        <span className="size-2.5 rounded-full bg-emerald-400" /> 3 im Voice
      </span>
      <span className="glass absolute -right-2 sm:-right-8 bottom-20 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2" style={{ animation: "float 7s ease-in-out -2s infinite" }}>
        <Icon name="bolt" className="size-4 text-amber-300" /> Stufe 3 erreicht
      </span>
    </div>
  );
}

function Latest() {
  const { t, lang } = useT();
  const { value } = useLoad(() => call<NewsPost[]>("GET", "/news"));
  const posts = (value ?? []).slice(0, 3);

  if (posts.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 mt-32">
      <Reveal className="flex items-end justify-between gap-4 mb-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("news.latest")}</h2>
        <Link to="/news" className="text-sm text-(--accent) hover:underline">{t("news.more")} →</Link>
      </Reveal>

      <div className="grid md:grid-cols-3 gap-4">
        {posts.map((post, index) => (
          <Reveal key={post.id} delay={index * 90}>
            <Link to={`/news/${post.id}`} className="glass rounded-3xl p-6 flex flex-col gap-3 h-full transition-transform hover:-translate-y-1">
              <span className="text-xs text-(--accent)">{t(`cat.${post.category}` as TextKey)} · {new Date(post.createdAt).toLocaleDateString(lang)}</span>
              <h3 className="text-lg font-semibold">{post.title}</h3>
              <p className="text-sm text-(--text-washed) line-clamp-3">{post.body.replace(/[*_~`>|#]/g, "")}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Home() {
  const { t } = useT();

  return (
    <>
      <section className="relative">
        <div className="aurora">
          <span className="top-[-10%] left-[8%] size-[34rem] bg-[#835afc]" />
          <span className="top-[10%] right-[4%] size-[28rem] bg-[#ff6bb3]/70" style={{ animationDelay: "-8s" }} />
          <span className="top-[40%] left-[40%] size-[24rem] bg-[#5fd4ff]/50" style={{ animationDelay: "-15s" }} />
        </div>
        <div className="grid-bg" />

        <div className="relative mx-auto max-w-6xl px-4 pt-20 sm:pt-28 pb-8 text-center">
          <Reveal>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-(--text-washed)">
              <span className="size-2 rounded-full bg-(--cyan) animate-pulse" /> {t("hero.badge")}
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-8 text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[1.02]">
              {t("hero.title1")}<br /><span className="gradient-text">{t("hero.title2")}</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-7 max-w-2xl text-lg sm:text-xl text-(--text-washed)">{t("hero.text")}</p>
          </Reveal>

          <Reveal delay={240} className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/download" className="btn btn-primary text-base"><Icon name="download" /> {t("hero.cta")}</Link>
            <a href="https://phreox.talk" className="btn btn-ghost text-base"><Icon name="globe" /> {t("hero.ctaApp")}</a>
          </Reveal>

          <Reveal delay={300}><p className="mt-5 text-sm text-(--text-dark)">{t("hero.platforms")}</p></Reveal>

          <Reveal delay={360}><AppMock /></Reveal>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 mt-32">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-widest text-(--accent)">{t("features.kicker")}</p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-bold tracking-tight">{t("features.title")}</h2>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={(index % 3) * 80} className={feature.span}>
              <article className={`glass relative overflow-hidden rounded-3xl p-7 h-full transition-transform duration-300 hover:-translate-y-1 bg-linear-to-br ${feature.tint} to-transparent`}>
                <span className="size-12 rounded-2xl bg-white/10 grid place-items-center text-white"><Icon name={feature.icon} className="size-6" /></span>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{t(feature.title)}</h3>
                <p className="mt-2 text-(--text-washed)">{t(feature.text)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <Latest />

      <Reveal className="mx-auto max-w-6xl px-4 mt-32">
        <div className="relative overflow-hidden rounded-[2rem] p-10 sm:p-16 text-center bg-linear-to-br from-[#835afc] via-[#a24df0] to-[#ff6bb3]">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #fff 0, transparent 40%), radial-gradient(circle at 80% 80%, #5fd4ff 0, transparent 40%)" }} />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">{t("download.title")}</h2>
            <p className="mt-4 text-white/85 max-w-xl mx-auto">{t("download.text")}</p>
            <Link to="/download" className="btn mt-8 bg-white text-[#2a1766] text-base"><Icon name="download" /> {t("hero.cta")}</Link>
          </div>
        </div>
      </Reveal>
    </>
  );
}
