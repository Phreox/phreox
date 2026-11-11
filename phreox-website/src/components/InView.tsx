import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades and slides its children in when they scroll into view. `delay` (ms) staggers neighbours. */
export function InView({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" }) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return setSeen(true);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setSeen(true); observer.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <Tag ref={ref as never} className={`inview ${seen ? "seen" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

/** A card whose glow follows the cursor. */
export function Glow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`glow ${className}`}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
      }}
    >
      {children}
    </div>
  );
}
