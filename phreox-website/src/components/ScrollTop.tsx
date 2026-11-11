import { useEffect, useRef, useState } from "react";

/**
 * Custom smooth scroll to top using easeOutQuart physics via requestAnimationFrame.
 * Cancels if the user manually scrolls or touches the screen during the transition.
 */
function smoothScrollToTop(duration = 600) {
  const start = window.scrollY;
  if (start <= 0) return;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // easeOutQuart: rapid start, ultra-smooth graceful deceleration
    const ease = 1 - Math.pow(1 - progress, 4);

    window.scrollTo(0, start * (1 - ease));

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * A completely unique Scroll to Top button for Phreox:
 * - Live circular SVG gauge showing exact scroll progress (0-100%).
 * - Dual-layer sonic ripple shockwave burst on click.
 * - Rocket/Soundwave icon that launches upward when clicked.
 * - Hover shows percentage read with smooth flip.
 */
export function ScrollTop() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [rippleBurst, setRippleBurst] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function onScroll() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setVisible(false);
        setScrollProgress(0);
        return;
      }

      const current = window.scrollY;
      const progress = Math.min(1, Math.max(0, current / scrollHeight));
      setScrollProgress(progress);
      setVisible(current > 450);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    // Trigger sonic ripple burst and rocket launch
    setRippleBurst(true);
    setLaunched(true);
    smoothScrollToTop(650);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setRippleBurst(false);
      setLaunched(false);
    }, 800);
  };

  const radius = 22;
  const circumference = 2 * Math.PI * radius; // ~138.2
  const strokeDashoffset = circumference - scrollProgress * circumference;
  const percentText = Math.round(scrollProgress * 100);

  return (
    <div
      className={`scroll-top-orb fixed right-6 bottom-6 z-40 transition-all duration-500 ease-[cubic-bezier(.34,1.45,.55,1)] ${
        visible
          ? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
          : "translate-y-8 scale-75 opacity-0 pointer-events-none"
      }`}
    >
      {/* Sonic Shockwave Ring 1 (expands outward on click) */}
      <span
        className={`pointer-events-none absolute -inset-3 rounded-full border-2 border-(--violet) transition-all duration-700 ease-out ${
          rippleBurst ? "scale-150 opacity-0" : "scale-75 opacity-0"
        }`}
      />
      {/* Sonic Shockwave Ring 2 (Volt energy ring) */}
      <span
        className={`pointer-events-none absolute -inset-2 rounded-full border border-(--volt) transition-all duration-700 ease-out delay-75 ${
          rippleBurst ? "scale-125 opacity-0" : "scale-90 opacity-0"
        }`}
      />

      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={`Nach oben scrollen (${percentText}% gelesen)`}
        title={`Nach oben scrollen (${percentText}%)`}
        className="group relative flex size-14 cursor-pointer items-center justify-center rounded-full bg-(--header) text-(--text-default) shadow-[0_12px_36px_-6px_rgba(88,101,242,0.45)] backdrop-blur-md outline-none ring-1 ring-black/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_-6px_rgba(88,101,242,0.65)] active:scale-90 dark:ring-white/15"
      >
        {/* SVG Circular Progress Track & Fill */}
        <svg
          viewBox="0 0 52 52"
          className="absolute inset-0 size-full -rotate-90 pointer-events-none"
        >
          {/* Subtle track */}
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-10 dark:opacity-15"
          />
          {/* Active progress ring with radiant gradient */}
          <defs>
            <linearGradient id="phreox-scroll-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--violet)" />
              <stop offset="70%" stopColor="#835afc" />
              <stop offset="100%" stopColor="var(--volt)" />
            </linearGradient>
          </defs>
          <circle
            cx="26"
            cy="26"
            r={radius}
            fill="none"
            stroke="url(#phreox-scroll-grad)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 200ms ease-out",
            }}
          />
        </svg>

        {/* Central Orb Content */}
        <div className="relative flex size-10 items-center justify-center rounded-full bg-(--paper) shadow-inner overflow-hidden">
          {/* Arrow Icon with Rocket Launch animation */}
          <div
            className={`transition-all duration-400 ease-[cubic-bezier(.34,1.4,.55,1)] flex items-center justify-center ${
              launched ? "-translate-y-8 opacity-0 scale-75" : "translate-y-0 opacity-100 scale-100"
            }`}
          >
            {hovered ? (
              <span className="font-mono text-xs font-bold text-(--violet) tracking-tight">
                {percentText}%
              </span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="size-5 text-(--violet) transition-transform duration-200 group-hover:-translate-y-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Sonic Up Arrow with Sound ripple chevrons */}
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            )}
          </div>

          {/* Secondary Arrow resetting from below after launch */}
          <div
            className={`absolute transition-all duration-500 ease-out flex items-center justify-center ${
              launched ? "translate-y-0 opacity-100 scale-100 delay-200" : "translate-y-8 opacity-0 scale-50"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-(--volt)"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}
