import { Link, NavLink, Outlet } from "react-router";
import { useSession } from "../api.ts";
import { setLang, useT } from "../i18n.ts";

const appUrl = "https://phreox.talk";

export function Layout() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const link = ({ isActive }: { isActive: boolean }) => `px-3 py-2 rounded-full text-sm transition-colors ${isActive ? "text-white bg-white/10" : "text-(--text-washed) hover:text-white"}`;

  async function logout() {
    await fetch("/_auth/logout", { method: "POST", headers: { "X-Phreox-Site": "1" } });
    await reload();
    location.assign("/");
  }

  return (
    <div className="relative min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-(--app-bg)/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <img src="/phreox-logo.png" alt="" className="size-8" />
            Phreox
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLink to="/" end className={link}>{t("nav.features")}</NavLink>
            <NavLink to="/download" className={link}>{t("nav.download")}</NavLink>
            <NavLink to="/news" className={link}>{t("nav.news")}</NavLink>
            {me?.flags.includes("super-admin") && <NavLink to="/dashboard" className={link}>{t("nav.dashboard")}</NavLink>}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-(--text-washed) hover:text-white border border-white/10 cursor-pointer" onClick={() => setLang(lang === "de" ? "en" : "de")}>
              {lang === "de" ? "EN" : "DE"}
            </button>
            <a href={appUrl} className="btn btn-primary btn-small hidden sm:inline-flex">{t("nav.openApp")}</a>
            {me && <button type="button" className="btn btn-ghost btn-small cursor-pointer" onClick={() => void logout()} title={me.username}>{t("nav.logout")}</button>}
          </div>
        </div>

        <nav className="md:hidden flex items-center justify-center gap-1 pb-2 px-2 overflow-x-auto">
          <NavLink to="/" end className={link}>{t("nav.features")}</NavLink>
          <NavLink to="/download" className={link}>{t("nav.download")}</NavLink>
          <NavLink to="/news" className={link}>{t("nav.news")}</NavLink>
          {me?.flags.includes("super-admin") && <NavLink to="/dashboard" className={link}>{t("nav.dashboard")}</NavLink>}
        </nav>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-white/5 mt-24">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-col sm:flex-row items-center gap-4 justify-between text-sm text-(--text-dark)">
          <p className="flex items-center gap-2"><img src="/phreox-logo.png" alt="" className="size-5 opacity-80" />{t("footer.text")}</p>
          <p>© {new Date().getFullYear()} Phreox · phreox.com · {t("footer.rights")}</p>
        </div>
      </footer>
    </div>
  );
}
