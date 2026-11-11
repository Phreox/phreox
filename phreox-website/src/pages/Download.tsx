import { useEffect, useRef, useState } from "react";
import { call, type Asset, type Channel, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
import { Glow, InView } from "../components/InView.tsx";
import { VerifyGuide } from "./Extras.tsx";
import { Ripples } from "../components/Mock.tsx";
import { type TextKey, useT } from "../i18n.ts";

type ChannelName = "release" | "beta" | "alpha";
type Channels = Partial<Record<ChannelName, Channel>>;

const tabs: ChannelName[] = ["release", "beta", "alpha"];
const order = ["windows", "macos", "linux", "android"] as const;

function size(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(0)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** The system of this browser, so that its download comes first. */
function mine(): Asset["platform"] {
  const agent = navigator.userAgent;

  if (/Android/i.test(agent)) return "android";
  if (/Mac/i.test(agent)) return "macos";
  if (/Win/i.test(agent)) return "windows";

  return "linux";
}

function Copy({ text }: { text: string }) {
  const { t } = useT();
  const [done, setDone] = useState(false);

  return (
    <button type="button" className="cursor-pointer rounded-full bg-black/5 px-3 py-1 text-xs font-semibold transition hover:bg-black/10 active:scale-95" onClick={() => { void navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); }}>
      {done ? <span className="pop inline-block text-emerald-600">✓ {t("dl.copied")}</span> : t("dl.copy")}
    </button>
  );
}

function Checksum({ asset }: { asset: Asset }) {
  const { t } = useT();

  if (!asset.sha256) return null;

  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-(--text-dark)">
      <span className="font-semibold">{t("dl.checksum")}</span>
      <code className="min-w-0 flex-1 truncate select-all">{asset.sha256}</code>
      <Copy text={asset.sha256} />
    </div>
  );
}

/** A button that confirms the click, so the user sees that something happens. */
function Get({ asset, light = false }: { asset: Asset; light?: boolean }) {
  const { t } = useT();
  const [started, setStarted] = useState(false);

  return (
    <a href={asset.url} download className={`btn ${light ? "btn-light" : "btn-primary"} text-lg`} onClick={() => { setStarted(true); setTimeout(() => setStarted(false), 3000); }}>
      {started ? <><Icon name="check" className="pop size-5" />{t("dl.started")}</> : <><Icon name="download" className="size-5" />{t("dl.get")} · {size(asset.size)}</>}
    </a>
  );
}

function Segmented({ value, onChange }: { value: ChannelName; onChange: (name: ChannelName) => void }) {
  const { t } = useT();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [box, setBox] = useState({ left: 4, width: 0 });

  useEffect(() => {
    const node = refs.current[value];
    if (node) setBox({ left: node.offsetLeft, width: node.offsetWidth });
  }, [value]);

  return (
    <div role="group" className="relative mt-8 inline-flex rounded-full bg-(--paper) p-1 ring-1 ring-black/5">
      <span className="pill" style={{ left: box.left, width: box.width }} />
      {tabs.map((name) => (
        <button key={name} ref={(node) => { refs.current[name] = node; }} type="button" aria-pressed={value === name} onClick={() => onChange(name)} className={`relative z-10 cursor-pointer rounded-full px-6 py-2 font-semibold transition-colors ${value === name ? "text-white" : "text-(--text-washed) hover:text-(--ink)"}`}>{t(`dl.${name}` as TextKey)}</button>
      ))}
    </div>
  );
}

export function Download() {
  const { t, lang } = useT();
  const { value, error } = useLoad(() => call<Channels>("GET", "/releases"));
  const [tab, setTab] = useState<ChannelName>("release");
  const channel = value?.[tab];
  const own = mine();
  const byPlatform = (platform: Asset["platform"]) => channel?.assets.find((asset) => asset.platform === platform);
  const main = byPlatform(own);

  return (
    <div className="relative overflow-hidden">
      <Ripples className="pointer-events-none absolute -top-60 -right-60 w-[48rem] opacity-40" />

      <section className="relative mx-auto max-w-[84rem] px-5 pt-16 sm:pt-24">
        <h1 className="display text-[clamp(3rem,9vw,7rem)]">{t("dl.title")}</h1>
        <p className="mt-4 max-w-2xl text-lg text-(--text-washed)">{t("dl.subtitle")}</p>

        <Segmented value={tab} onChange={setTab} />
        <p className="mt-3 text-(--text-washed)">{t(`dl.note.${tab}` as TextKey)}</p>

        {error && <p role="alert" className="mt-10 text-red-600">{t("common.error")}</p>}
        {!value && !error && <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]"><div className="skeleton h-72" /><div className="skeleton h-72" /></div>}
        {value && !channel && <p className="mt-10 max-w-xl text-lg text-(--text-washed)">{t("dl.none")}</p>}

        {channel && (
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="hero-bg relative overflow-hidden rounded-[2.25rem] p-8 text-white shadow-[0_30px_70px_-30px_rgb(88_101_242/0.8)] sm:p-12">
              <Ripples className="pointer-events-none absolute -right-24 -bottom-24 w-[28rem] opacity-40" color="#fff" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-semibold"><span className="size-2 rounded-full bg-[#57f287]" />{t("dl.recommended")}</span>
                <p className="display mt-5 flex items-center gap-4 text-[clamp(2.6rem,6vw,4.5rem)]"><Icon name={own} className="size-14" />{t(`platform.${own}` as TextKey)}</p>
                <p className="mt-3 text-white/85">{t("dl.version")} <span className="font-mono">{channel.version}</span> · {t("dl.published")} {new Date(channel.publishedAt).toLocaleDateString(lang)}</p>
                <div className="mt-7">{main ? <Get asset={main} light /> : <span className="btn bg-white/20 text-white">{t("dl.unavailable")}</span>}</div>
                {main?.sha256 && <div className="mt-5 text-white/80 [&_button]:bg-white/20 [&_button]:text-white [&_*]:text-white/80"><Checksum asset={main} /></div>}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Glow className="rounded-[2.25rem] border border-black/10 bg-(--paper) p-7">
                <p className="display text-3xl">{t("dl.web")}</p>
                <p className="mt-1 text-(--text-washed)">{t("dl.webText")}</p>
                <a href="https://phreox.talk" className="btn btn-primary mt-5"><Icon name="globe" className="size-5" />{t("nav.openApp")}</a>
              </Glow>
              <Glow className="rounded-[2.25rem] border border-black/10 bg-(--paper) p-7">
                <p className="display text-3xl">{t("dl.verify")}</p>
                <p className="mt-1 text-(--text-washed)">SHA-256 · {t("dl.published")} {new Date(channel.publishedAt).toLocaleDateString(lang)}</p>
              </Glow>
            </div>
          </div>
        )}

        {channel && (
          <>
            <h2 className="display mt-16 text-4xl">{t("dl.other")}</h2>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {order.map((platform, index) => {
                const asset = byPlatform(platform);

                return (
                  <InView as="li" key={`${tab}-${platform}`} delay={index * 80}>
                    <Glow className={`lift h-full rounded-3xl border p-6 ${platform === own ? "border-(--violet) bg-(--paper)" : "border-black/10 bg-(--paper)"} ${asset ? "" : "opacity-55"}`}>
                      <span className="flex size-14 items-center justify-center rounded-2xl bg-(--violet) text-white"><Icon name={platform} className="size-8" /></span>
                      <p className="display mt-4 text-3xl">{t(`platform.${platform}` as TextKey)}</p>
                      <p className="mt-1 truncate text-sm text-(--text-dark)">{asset ? `${asset.name} · ${size(asset.size)}` : t("dl.unavailable")}</p>
                      {asset && <a href={asset.url} download className="btn btn-ghost btn-small mt-4"><Icon name="download" className="size-4" />{t("dl.get")}</a>}
                      {asset && <Checksum asset={asset} />}
                    </Glow>
                  </InView>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
