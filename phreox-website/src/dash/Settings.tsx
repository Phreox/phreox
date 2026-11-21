import { defaults, setDashSettings, useDashSettings, type Widget, widgetNames } from "../dashSettings.ts";
import { type TextKey, useT } from "../i18n.ts";
import { Button, Panel, Segmented, Toggle } from "./ui.tsx";

const widgetLabel: Record<Widget, TextKey> = { queue: "dash.ov.queue", stats: "dash.w.stats", accounts: "dash.w.accounts", spaces: "dash.w.spaces", audit: "dash.w.audit", news: "dash.w.news", system: "dash.w.system", roles: "dash.w.roles" };

function Line({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border-surface) py-3 first:border-0 first:pt-0 last:pb-0">
      <span className="text-sm text-(--text-washed)">{name}</span>
      {children}
    </div>
  );
}

/** How this dashboard looks in this browser. */
export function Settings() {
  const { t } = useT();
  const settings = useDashSettings();

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title={t("dash.set.title")} hint={t("dash.set.hint")} action={<Button kind="ghost" small onClick={() => setDashSettings(defaults)}>{t("dash.set.reset")}</Button>}>
        <Line name={t("dash.set.density")}>
          <Segmented label={t("dash.set.density")} value={settings.density} onChange={(density) => setDashSettings({ ...settings, density })} options={[{ value: "comfortable", label: t("dash.set.comfortable") }, { value: "compact", label: t("dash.set.compact") }]} />
        </Line>
        <Line name={t("dash.set.refresh")}>
          <Segmented label={t("dash.set.refresh")} value={settings.refresh} onChange={(refresh) => setDashSettings({ ...settings, refresh })} options={([0, 15, 30, 60] as const).map((seconds) => ({ value: seconds, label: seconds === 0 ? t("dash.set.off") : t("dash.set.seconds", { n: seconds }) }))} />
        </Line>
        <Line name={t("dash.set.sort")}>
          <Segmented label={t("dash.set.sort")} value={settings.sort} onChange={(sort) => setDashSettings({ ...settings, sort })} options={[{ value: "newest", label: t("dash.set.newest") }, { value: "name", label: t("dash.set.name") }]} />
        </Line>
        <Line name={t("dash.set.ids")}>
          <Toggle label={t("dash.set.ids")} on={settings.ids} onChange={(ids) => setDashSettings({ ...settings, ids })} />
        </Line>
      </Panel>

      <Panel title={t("dash.set.widgets")}>
        {widgetNames.map((name) => (
          <Line key={name} name={t(widgetLabel[name])}>
            <Toggle label={t(widgetLabel[name])} on={settings.widgets[name]} onChange={(on) => setDashSettings({ ...settings, widgets: { ...settings.widgets, [name]: on } })} />
          </Line>
        ))}
      </Panel>
    </div>
  );
}
