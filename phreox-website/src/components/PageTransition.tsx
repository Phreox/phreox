import { useEffect, useLayoutEffect, useRef, ViewTransition, type ReactNode } from "react";
import { useLocation } from "react-router";
import { EchoShiftOverlay } from "./EchoShiftOverlay.tsx";

/** One shared content surface keeps the shell stationary while React coordinates both snapshots. */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const content = useRef<HTMLElement>(null);
  const group = /^\/(ember|volt|glimmer)(\/|$)/.test(pathname) ? "plans" : pathname;

  useEffect(() => {
    function origin(event: MouseEvent | KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event instanceof KeyboardEvent && event.key !== "Enter") return;
      if (event instanceof MouseEvent && event.button !== 0) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href);
      if (destination.origin !== location.origin || destination.pathname === location.pathname) return;
      const box = content.current?.getBoundingClientRect();
      if (!box) return;
      const link = target.getBoundingClientRect();
      const x = event instanceof MouseEvent && event.detail > 0 ? event.clientX : link.left + link.width / 2;
      const y = event instanceof MouseEvent && event.detail > 0 ? event.clientY : link.top + link.height / 2;
      document.documentElement.style.setProperty("--echo-x", `${Math.max(0, Math.min(box.width, x - box.left))}px`);
      document.documentElement.style.setProperty("--echo-y", `${Math.max(0, y - box.top)}px`);
    }
    document.addEventListener("click", origin, true);
    document.addEventListener("keydown", origin, true);
    return () => {
      document.removeEventListener("click", origin, true);
      document.removeEventListener("keydown", origin, true);
    };
  }, []);

  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    // Named descendants are removed from the content snapshot and can reform at their own pace.
    const heading = node.querySelector("h1");
    const lead = heading?.parentElement?.querySelector("p");
    const download = node.querySelector('a[href="/download"]');
    const elements = [[heading, "echo-heading"], [lead, "echo-lead"], [download, "echo-download"]] as const;
    for (const [element, name] of elements) {
      if (element instanceof HTMLElement) {
        const shared = name === "echo-download";
        element.style.viewTransitionName = shared ? name : `${name}-${pathname.replace(/[^a-z0-9]/gi, "-") || "home"}`;
        element.style.setProperty("view-transition-class", name);
      }
    }
    return () => {
      for (const [element] of elements) {
        if (element instanceof HTMLElement) {
          element.style.removeProperty("view-transition-name");
          element.style.removeProperty("view-transition-class");
        }
      }
    };
  }, [pathname]);

  return (
    <ViewTransition key={group} name="echo-content" share="echo-content" enter="echo-content" exit="echo-content" update="none">
      <main ref={content} className="echo-content relative flex-1 flex flex-col w-full">
        {children}
        <EchoShiftOverlay />
      </main>
    </ViewTransition>
  );
}
