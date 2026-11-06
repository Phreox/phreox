import { useState } from "react";
import { call, type Asset, type Channel, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
import { Reveal } from "../components/Reveal.tsx";
import { type TextKey, useT } from "../i18n.ts";

type Channels = Partial<Record<"release" | "beta" | "alpha", Channel>>;

const order = ["windows", "macos", "linux", "android"] as const;
const tabs = ["release", "beta", "alpha"] as const;

function size(bytes: number) {
  return bytes > 1_000_000 ? `${(bytes / 1_000_000).toFixed(0)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/** The platform of this browser, so its download is offered first. */
function mine(): string {
  const agent = navigator.userAgent;

  if (/Android/i.test(agent)) return "android";
  if (/Mac/i.test(agent)) return "macos";
  if (/Win/i.test(agent)) return "windows";

  return "linux";
}

function Card({ asset }: { asset: Asset }) {
  const { t } = useT();
  const [shown, setShown] = useState(false);
  const own = mine() === asset.platform;

  return (
    <div className={`glass rounded-3xl p-6 flex flex-col gap-4 ${own ? "ring-1 ring-(--brand) shadow-[0_0_60px_-20px_var(--brand)]" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="size-11 rounded-2xl bg-white/10 grid place-items-center"><Icon name={asset.platform} className="size-6" /></span>
        <div>
          <p className="font-semibold">{t(`platform.${asset.platform}` as TextKey)}</p>
          <p className="text-xs text-(--text-dark)">{size(asset.size)} · .{asset.name.split(".").pop()}</p>
        </div>
      </div>

      <a href={asset.url} className="btn btn-primary btn-small" download><Icon name="download" className="size-4" /> {t("nav.download")}</a>

      {asset.sha256 && (
        <button type="button" className="text-left text-xs text-(--text-dark) hover:text-(--text-washed) cursor-pointer" onClick={() => setShown(!shown)}>
          {shown ? <code className="break-all">{asset.sha256}</code> : t("download.checksum")}
        </button>
      )}
    </div>
  );
}

export function Download() {
  const { t, lang } = useT();
  const { value, error } = useLoad(() => call<Channels>("GET", "/releases"));
  const [tab, setTab] = useState<(typeof tabs)[number]>("release");
  const channel = value?.[tab];

  return (
    <div className="relative">
      <div className="aurora"><span className="top-[-20%] left-[20%] size-[30rem] bg-[#835afc]/70" /></div>

      <section className="relative mx-auto max-w-5xl px-4 pt-20">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-(--accent)">{t("download.kicker")}</p>
          <h1 className="mt-3 text-4xl sm:text-6xl font-extrabold tracking-tight">{t("download.title")}</h1>
          <p className="mt-4 text-(--text-washed) max-w-xl mx-auto">{t("download.text")}</p>
        </Reveal>

        <Reveal delay={100} className="mt-10 flex justify-center">
          <div className="glass rounded-full p-1 flex gap-1">
            {tabs.map((name) => (
              <button key={name} type="button" className={`px-5 py-2 rounded-full text-sm font-semibold cursor-pointer transition-colors ${tab === name ? "bg-(--brand) text-white" : "text-(--text-washed) hover:text-white"}`} onClick={() => setTab(name)}>
                {t(`download.${name}` as TextKey)}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10">
          {error && <p className="text-center text-sm text-red-400">{t("common.error")}</p>}
          {!value && !error && <p className="text-center text-(--text-dark)">{t("common.loading")}</p>}
          {value && !channel && <p className="text-center text-(--text-washed)">{t("download.none")}</p>}

          {channel && (
            <>
              <p className="text-center text-sm text-(--text-dark) mb-6">
                {t("download.version")} <span className="text-(--text-default) font-mono">{channel.version}</span> · {t("download.published")} {new Date(channel.publishedAt).toLocaleDateString(lang)}
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...channel.assets].sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform)).map((asset) => <Card key={asset.name} asset={asset} />)}
              </div>
            </>
          )}
        </div>

        <Reveal className="mt-16 glass rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-5 justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t("download.web")}</h2>
            <p className="text-(--text-washed) mt-1">{t("download.webText")}</p>
          </div>
          <a href="https://phreox.talk" className="btn btn-ghost"><Icon name="globe" /> {t("nav.openApp")}</a>
        </Reveal>
      </section>
    </div>
  );
}
