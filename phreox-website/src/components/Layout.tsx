import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useSession } from "../api.ts";
import { setLang, useT } from "../i18n.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { ScrollTop } from "./ScrollTop.tsx";
import { PageTransition } from "./PageTransition.tsx";

const appUrl = "https://phreox.talk";

export function Layout() {
  const { t, lang } = useT();
  const { me, reload } = useSession();
  const [night, setNight] = useState(() => localStorage.getItem("theme") ? localStorage.getItem("theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { localStorage.setItem("theme", night ? "dark" : "light"); document.documentElement.style.backgroundColor = night ? "#14151c" : "#fff"; }, [night]);
  const admin = me?.flags.includes("super-admin") || me?.flags.includes("support");
  // The dashboard uses the whole width, the other pages a column.
  const wide = useLocation().pathname.startsWith("/dashboard");
  const width = wide ? "max-w-none sm:px-6" : "max-w-[84rem]";

  async function logout() {
    await fetch("/_auth/logout", { method: "POST", headers: { "X-Phreox-Site": "1" } });
    await reload();
    location.assign("/");
  }

  const de = lang === "de";
  const items = [
    { to: "/features", label: de ? "Funktionen" : "Features" },
    { to: "/ember", label: "Ember" },
    { to: "/volt", label: "Volt" },
    { to: "/glimmer", label: "Glimmer" },
    { to: "/download", label: t("nav.download") },
    { to: "/news", label: t("nav.news") },
    { to: "/support", label: "Support" },
    ...(admin ? [{ to: "/dashboard", label: t("nav.dashboard") }] : []),
  ];
  const path = useLocation().pathname;
  const activeTo = items.find((item) => path.startsWith(item.to))?.to;

  // The header reacts to the scroll: it gets smaller, casts a shadow and shows how far the page is read.
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - innerHeight;

      setScrolled(scrollY > 12);
      bar.current?.style.setProperty("transform", `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`);
    }

    onScroll();
    addEventListener("scroll", onScroll, { passive: true });

    return () => removeEventListener("scroll", onScroll);
  }, [path]);

  // A new page starts at the top, and the mobile menu closes.
  useLayoutEffect(() => { scrollTo({ top: 0, behavior: "instant" }); setMenu(false); }, [path]);

  // The pill of the navigation follows the mouse and rests on the page you are on.
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [hover, setHover] = useState<string>();
  const [pill, setPill] = useState({ left: 0, width: 0, show: false });
  const target = hover ?? activeTo;

  useLayoutEffect(() => {
    const node = target ? refs.current[target] : undefined;

    setPill(node ? { left: node.offsetLeft, width: node.offsetWidth, show: true } : (old) => ({ ...old, show: false }));
  }, [target, lang, admin]);

  return (
    <div className={`flex min-h-dvh flex-col ${wide ? "" : night ? "site night" : "site"}`}>
      <header className={`site-header sticky top-0 z-40 border-b bg-(--header)/85 backdrop-blur-md transition-all duration-300 ${scrolled ? "border-black/10 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.35)]" : "border-transparent"}`}>
        <div className={`mx-auto flex h-16 ${width} items-center gap-3 px-5 transition-[height] duration-300`}>
          <Link to="/" className="group flex items-center gap-3">
            <img src="/phreox-logo.png" alt="" className="size-9 rounded-[0.7rem] transition-transform duration-500 group-hover:rotate-[-12deg] group-hover:scale-110" />
            <span className="display text-2xl transition-colors group-hover:text-(--violet)" style={{ letterSpacing: "-0.01em" }}>Phreox</span>
          </Link>

          <nav className="relative ml-6 hidden items-center md:flex" aria-label="Hauptmenü" onMouseLeave={() => setHover(undefined)}>
            <span className="absolute inset-y-0 rounded-lg bg-(--paper) ring-1 ring-(--violet)/15" style={{ left: pill.left, width: pill.width, opacity: pill.show ? 1 : 0, transition: "left 350ms cubic-bezier(.3,.8,.3,1), width 350ms cubic-bezier(.3,.8,.3,1), opacity 200ms" }} />
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} ref={(node) => { refs.current[item.to] = node; }} onMouseEnter={() => setHover(item.to)} onFocus={() => setHover(item.to)} onBlur={() => setHover(undefined)} className={`relative z-10 rounded-lg px-3 py-2 text-[0.95rem] font-medium transition-colors duration-200 ${item.to === activeTo ? "text-(--violet-deep)" : target === item.to ? "text-(--ink)" : "text-(--text-washed)"}`}>{item.label}</NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
            <button type="button" className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-semibold text-(--text-washed) transition hover:bg-(--paper) hover:text-(--violet-deep) active:scale-90" onClick={() => setLang(lang === "de" ? "en" : "de")} aria-label={lang === "de" ? "English" : "Deutsch"}>{lang === "de" ? "EN" : "DE"}</button>
            <ThemeToggle night={night} onToggle={() => setNight(!night)} />
            {me && <button type="button" className="btn btn-ghost btn-small hidden cursor-pointer sm:inline-flex" onClick={() => void logout()} title={me.username}>{t("nav.logout")}</button>}
            <a href={appUrl} className="btn btn-primary btn-small hidden sm:inline-flex">{t("nav.openApp")}</a>
            <button type="button" className="relative flex size-9 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-full transition hover:bg-(--paper) active:scale-90 md:hidden" onClick={() => setMenu(!menu)} aria-label="Menü" aria-expanded={menu}>
              <span className="h-0.5 w-5 rounded bg-current transition-transform duration-300" style={{ transform: menu ? "translateY(7px) rotate(45deg)" : "none" }} />
              <span className="h-0.5 w-5 rounded bg-current transition-opacity duration-200" style={{ opacity: menu ? 0 : 1 }} />
              <span className="h-0.5 w-5 rounded bg-current transition-transform duration-300" style={{ transform: menu ? "translateY(-7px) rotate(-45deg)" : "none" }} />
            </button>
          </div>
        </div>

        <div className="grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(.3,.8,.3,1)] md:hidden" style={{ gridTemplateRows: menu ? "1fr" : "0fr" }}>
          <nav className="overflow-hidden" aria-label="Hauptmenü">
            <ul className="flex flex-col gap-1 px-4 pb-4">
              {items.map((item, index) => (
                <li key={item.to} style={{ transition: "opacity 300ms, transform 300ms", transitionDelay: menu ? `${index * 40}ms` : "0ms", opacity: menu ? 1 : 0, transform: menu ? "none" : "translateY(-8px)" }}>
                  <NavLink to={item.to} className={`block rounded-xl px-4 py-3 font-semibold ${item.to === activeTo ? "bg-(--paper) text-(--violet-deep)" : "text-(--text-washed)"}`}>{item.label}</NavLink>
                </li>
              ))}
              <li className="pt-2"><a href={appUrl} className="btn btn-primary w-full">{t("nav.openApp")}</a></li>
            </ul>
          </nav>
        </div>

        <div ref={bar} className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-(--violet)" style={{ transform: "scaleX(0)" }} />
      </header>

      <PageTransition>
        <Outlet />
      </PageTransition>

      <ScrollTop />

      <footer className={`${wide ? "mt-12" : "mt-28"} border-t border-black/10`}>
        <div className={`mx-auto grid ${width} gap-10 px-5 py-12 lg:grid-cols-[1fr_auto]`}>
          <div>
            <p className="flex items-center gap-3"><img src="/phreox-logo.png" alt="" className="size-9 rounded-[0.7rem]" /><span className="display text-2xl">Phreox</span></p>
            <p className="mt-3 max-w-xs text-(--text-washed)">{t("footer.text")}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-14 gap-y-8 sm:grid-cols-3">
            {([
              [t("footer.product"), [[t("nav.openApp"), appUrl], [t("nav.download"), "/download"], [lang === "de" ? "Funktionen" : "Features", "/features"], ["Ember", "/ember"], ["Volt", "/volt"], ["Glimmer", "/glimmer"], [t("nav.news"), "/news"]]],
              [lang === "de" ? "Hilfe" : "Help", [["Support", "/support"], [lang === "de" ? "Sicherheit" : "Safety", "/safety"], [lang === "de" ? "Über uns" : "About", "/about"]]],
              [lang === "de" ? "Rechtliches" : "Legal", [[lang === "de" ? "Datenschutz" : "Privacy", "/privacy"], [lang === "de" ? "Nutzungsbedingungen" : "Terms", "/terms"], [lang === "de" ? "Impressum" : "Imprint", "/imprint"]]],
            ] as [string, [string, string][]][]).map(([title, items]) => (
              <div key={title}>
                <p className="font-semibold">{title}</p>
                <ul className="mt-3 flex flex-col gap-2 text-(--text-washed)">
                  {items.map(([label, to]) => <li key={to}>{to.startsWith("http") ? <a className="hover:text-(--violet-deep)" href={to}>{label}</a> : <Link className="hover:text-(--violet-deep)" to={to}>{label}</Link>}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className={`mx-auto ${width} px-5 pb-10 text-sm text-(--text-dark)`}>© {new Date().getFullYear()} Phreox · phreox.com · {t("footer.rights")}</p>
      </footer>
    </div>
  );
}
