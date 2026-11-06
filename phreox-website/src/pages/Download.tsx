import { useState } from "react";
import { call, type Asset, type Channel, useLoad } from "../api.ts";
import { Icon } from "../components/Icons.tsx";
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

function Checksum({ asset }: { asset: Asset }) {
  const { t } = useT();

  return asset.sha256 ? <details className="text-xs text-(--text-dark)"><summary className="cursor-pointer hover:text-(--text-washed)">{t("dl.checksum")}</summary><code className="mt-1 block break-all select-all">{asset.sha256}</code></details> : null;
}

export function Download() {
  const { t, lang } = useT();
  const { value, error } = useLoad(() => call<Channels>("GET", "/releases"));
  const [tab, setTab] = useState<ChannelName>("release");
  const channel = value?.[tab];
  const own = channel?.assets.find((asset) => asset.platform === mine());
  const others = (channel?.assets ?? []).filter((asset) => asset !== own).sort((a, b) => order.indexOf(a.platform) - order.indexOf(b.platform));

  return (
    <div className="relative overflow-hidden">
      <Ripples className="pointer-events-none absolute -top-60 -right-60 w-[48rem] opacity-50" />

      <section className="relative mx-auto max-w-4xl px-5 pt-16 sm:pt-24">
        <h1 className="display text-[clamp(3rem,9vw,6.5rem)]">{t("dl.title")}</h1>

        <div role="group" className="mt-10 inline-flex rounded-2xl bg-white/7 p-1">
          {tabs.map((name) => (
            <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)} className={`cursor-pointer rounded-xl px-5 py-2 font-semibold transition-colors ${tab === name ? "bg-(--violet) text-white" : "text-(--text-washed) hover:text-white"}`}>{t(`dl.${name}` as TextKey)}</button>
          ))}
        </div>
        <p className="mt-3 text-(--text-washed)">{t(`dl.note.${tab}` as TextKey)}</p>

        <div className="mt-10">
          {error && <p role="alert" className="text-red-400">{t("common.error")}</p>}
          {!value && !error && <p className="text-(--text-dark)">{t("common.loading")}</p>}
          {value && !channel && <p className="max-w-xl text-lg text-(--text-washed)">{t("dl.none")}</p>}

          {channel && (
            <>
              {own && (
                <div className="rounded-[2rem] bg-(--violet) p-6 sm:p-10">
                  <p className="flex items-center gap-3 text-lg font-medium text-white/85"><Icon name={own.platform} className="size-6" />{t("dl.for")} {t(`platform.${own.platform}` as TextKey)}</p>
                  <a href={own.url} download className="btn btn-light mt-5 text-lg"><Icon name="download" className="size-5" />{t("dl.get")} · {size(own.size)}</a>
                  <p className="mt-5 text-sm text-white/80">{t("dl.version")} <span className="font-mono">{channel.version}</span> · {t("dl.published")} {new Date(channel.publishedAt).toLocaleDateString(lang)}</p>
                  <div className="mt-2 text-white/70 [&_*]:text-white/70"><Checksum asset={own} /></div>
                </div>
              )}

              {!own && <p className="mb-4 text-sm text-(--text-dark)">{t("dl.version")} <span className="font-mono text-(--text-washed)">{channel.version}</span> · {t("dl.published")} {new Date(channel.publishedAt).toLocaleDateString(lang)}</p>}

              {others.length > 0 && (
                <>
                  <h2 className="display mt-12 text-3xl">{t("dl.other")}</h2>
                  <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                    {others.map((asset) => (
                      <li key={asset.name} className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4">
                        <Icon name={asset.platform} className="size-6 text-(--lilac)" />
                        <div className="min-w-0 flex-1"><p className="font-semibold">{t(`platform.${asset.platform}` as TextKey)}</p><p className="truncate text-sm text-(--text-dark)">{asset.name} · {size(asset.size)}</p><Checksum asset={asset} /></div>
                        <a href={asset.url} download className="btn btn-ghost btn-small"><Icon name="download" className="size-4" />{t("dl.get")}</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 rounded-[2rem] bg-white/6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div><h2 className="display text-3xl">{t("dl.web")}</h2><p className="mt-1 text-(--text-washed)">{t("dl.webText")}</p></div>
          <a href="https://phreox.talk" className="btn btn-primary"><Icon name="globe" className="size-5" />{t("nav.openApp")}</a>
        </div>
      </section>
    </div>
  );
}
