import { type ReactNode, useEffect, useRef } from "react";

/** Fades its content in as it scrolls into view. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;

    if (!node) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;

      node.classList.add("visible");
      observer.disconnect();
    }, { threshold: 0.12 });

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return <div ref={element} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
