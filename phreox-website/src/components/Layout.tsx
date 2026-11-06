import { Link, NavLink, Outlet } from "react-router";
import { useSession } from "../api.ts";
import { setLang, useT } from "../i18n.ts";

const appUrl = "https://phreox.talk";

export function Layout() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const link = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors ${isActive ? "text-white" : "text-(--text-washed) hover:text-white"}`;
  const admin = me?.flags.includes("super-admin");

  async function logout() {
    await fetch("/_auth/logout", { method: "POST", headers: { "X-Phreox-Site": "1" } });
    await reload();
    location.assign("/");
  }

  const links = (
    <>
      <NavLink to="/download" className={link}>{t("nav.download")}</NavLink>
      <NavLink to="/news" className={link}>{t("nav.news")}</NavLink>
      {admin && <NavLink to="/dashboard" className={link}>{t("nav.dashboard")}</NavLink>}
    </>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-white/8 bg-(--ink)/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <Link to="/" className="flex items-center gap-3">
            <img src="/phreox-logo.png" alt="" className="size-9 rounded-[0.7rem]" />
            <span className="display text-2xl" style={{ letterSpacing: "-0.01em" }}>Phreox</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Hauptmenü">{links}</nav>

          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-semibold text-(--text-washed) hover:text-white" onClick={() => setLang(lang === "de" ? "en" : "de")} aria-label={lang === "de" ? "English" : "Deutsch"}>{lang === "de" ? "EN" : "DE"}</button>
            {me && <button type="button" className="btn btn-ghost btn-small cursor-pointer" onClick={() => void logout()} title={me.username}>{t("nav.logout")}</button>}
            <a href={appUrl} className="btn btn-primary btn-small">{t("nav.openApp")}</a>
          </div>
        </div>

        <nav className="flex items-center justify-center gap-1 overflow-x-auto px-3 pb-2 md:hidden" aria-label="Hauptmenü">{links}</nav>
      </header>

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-28 border-t border-white/8">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-3"><img src="/phreox-logo.png" alt="" className="size-9 rounded-[0.7rem]" /><span className="display text-2xl">Phreox</span></p>
            <p className="mt-3 max-w-xs text-(--text-washed)">{t("footer.text")}</p>
          </div>

          <div>
            <p className="font-semibold">{t("footer.product")}</p>
            <ul className="mt-3 flex flex-col gap-2 text-(--text-washed)">
              <li><a className="hover:text-white" href={appUrl}>{t("nav.openApp")}</a></li>
              <li><Link className="hover:text-white" to="/download">{t("nav.download")}</Link></li>
              <li><Link className="hover:text-white" to="/news">{t("nav.news")}</Link></li>
            </ul>
          </div>
        </div>

        <p className="mx-auto max-w-6xl px-5 pb-10 text-sm text-(--text-dark)">© {new Date().getFullYear()} Phreox · phreox.com · {t("footer.rights")}</p>
      </footer>
    </div>
  );
}
