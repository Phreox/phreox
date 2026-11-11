/**
 * Phreox Signature Day/Night Toggle.
 * Infuses Tareg Mahmud's sky switch with Phreox brand identity:
 * - Day: Phreox Blurple sky (#5865f2 -> #7983f5), Volt-energy sun (#ffd84a), sound-ripple rings & fluffy white clouds.
 * - Night: Phreox Deep Ink sky (#0c0d14 -> #1a1c2b), lilac-silver moon with crater reliefs & Volt starbursts.
 * - Signature Phreox sound ripple rings radiating from both sun and moon.
 */
export function ThemeToggle({
  night,
  onToggle,
}: {
  night: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={night}
      aria-label={night ? "Dark mode aktiv. Zu Light mode wechseln" : "Light mode aktiv. Zu Dark mode wechseln"}
      onClick={onToggle}
      className="group relative h-[34px] w-[74px] cursor-pointer rounded-full p-[3px] outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-(--violet) active:scale-95"
      style={{
        boxShadow: night
          ? "inset 0 2px 4px rgba(0,0,0,0.7), 0 0 0 1.5px rgba(255,255,255,0.12), 0 4px 12px -2px rgba(88,101,242,0.25)"
          : "inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 1.5px rgba(88,101,242,0.2), 0 4px 12px -2px rgba(255,216,74,0.3)",
      }}
    >
      {/* Clipped Sky Pill Container */}
      <div className="relative size-full overflow-hidden rounded-full">
        {/* ================= DAY SKY (Phreox Blurple & Volt Glow) ================= */}
        <div
          className="absolute inset-0 transition-opacity duration-500 ease-in-out"
          style={{
            opacity: night ? 0 : 1,
            background: "linear-gradient(135deg, #5865f2 0%, #6875f5 50%, #7e8bfa 100%)",
          }}
        >
          {/* Sound-Ripple Arc 3 (Outer) */}
          <div
            className="absolute -left-3 -top-8 size-32 rounded-full border border-white/20 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              transform: night ? "translateX(-24px) scale(0.6)" : "translateX(0) scale(1)",
            }}
          />
          {/* Sound-Ripple Arc 2 (Middle) */}
          <div
            className="absolute -left-1 -top-6 size-24 rounded-full border border-white/25 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.14)",
              transform: night ? "translateX(-24px) scale(0.6)" : "translateX(0) scale(1)",
            }}
          />
          {/* Sound-Ripple Arc 1 (Inner Aura around Sun) */}
          <div
            className="absolute left-1 -top-3.5 size-18 rounded-full border border-white/30 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.22)",
              transform: night ? "translateX(-24px) scale(0.6)" : "translateX(0) scale(1)",
            }}
          />

          {/* Phreox Volt Day Sparkle */}
          <div
            className="absolute left-10 top-1.5 transition-transform duration-500"
            style={{
              transform: night ? "translateY(-6px) scale(0.5)" : "translateY(0) scale(1)",
            }}
          >
            <svg viewBox="0 0 10 10" className="size-2.5 text-[#ffd84a]" fill="currentColor">
              <path d="M5 0 Q5 5 10 5 Q5 5 5 10 Q5 5 0 5 Q5 5 5 0 Z" />
            </svg>
          </div>

          {/* Fluffy Layered Clouds on the bottom right */}
          <div
            className="pointer-events-none absolute -bottom-1 -right-0.5 transition-transform duration-500 ease-[cubic-bezier(.34,1.25,.64,1)]"
            style={{
              transform: night ? "translateY(28px) scale(0.7)" : "translateY(0) scale(1)",
            }}
          >
            {/* Back cloud (soft lilac shadow) */}
            <div className="absolute -bottom-1 right-2 flex items-end opacity-75">
              <span className="size-5 -mr-2 rounded-full bg-[#c9b9ff]/60" />
              <span className="size-7 -mr-2 rounded-full bg-[#f4f0ff]/80" />
              <span className="size-6 rounded-full bg-[#c9b9ff]/60" />
            </div>
            {/* Front cloud (crisp Phreox white) */}
            <div className="relative flex items-end">
              <span className="size-4.5 -mr-1.5 rounded-full bg-white/90" />
              <span className="size-6.5 -mr-1.5 rounded-full bg-white" />
              <span className="size-5 rounded-full bg-white/95" />
            </div>
          </div>
        </div>

        {/* ================= NIGHT SKY (Phreox Deep Ink & Violet Nebula) ================= */}
        <div
          className="absolute inset-0 transition-opacity duration-500 ease-in-out"
          style={{
            opacity: night ? 1 : 0,
            background: "linear-gradient(135deg, #0b0b14 0%, #131422 50%, #1a1c30 100%)",
          }}
        >
          {/* Sound-Ripple Arc 3 (Outer Violet Nebula) */}
          <div
            className="absolute -right-3 -top-8 size-32 rounded-full border border-(--violet)/20 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(91, 52, 214, 0.12)",
              transform: night ? "translateX(0) scale(1)" : "translateX(24px) scale(0.6)",
            }}
          />
          {/* Sound-Ripple Arc 2 (Middle) */}
          <div
            className="absolute -right-1 -top-6 size-24 rounded-full border border-(--violet)/30 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(131, 90, 252, 0.16)",
              transform: night ? "translateX(0) scale(1)" : "translateX(24px) scale(0.6)",
            }}
          />
          {/* Sound-Ripple Arc 1 (Inner Aura around Moon) */}
          <div
            className="absolute right-1 -top-3.5 size-18 rounded-full border border-(--violet)/40 transition-transform duration-700 ease-out"
            style={{
              backgroundColor: "rgba(201, 185, 255, 0.18)",
              transform: night ? "translateX(0) scale(1)" : "translateX(24px) scale(0.6)",
            }}
          />

          {/* Twinkling Phreox Constellation on the left */}
          <svg
            viewBox="0 0 60 28"
            className="pointer-events-none absolute inset-0 size-full transition-all duration-500"
            style={{
              opacity: night ? 1 : 0,
              transform: night ? "translateY(0)" : "translateY(-6px)",
            }}
            fill="none"
          >
            {/* Primary Volt Sparkle (electric gold) */}
            <path
              d="M14 5 Q14 8 16.5 8 Q14 8 14 11 Q14 8 11.5 8 Q14 8 14 5 Z"
              fill="#ffd84a"
              className={night ? "animate-pulse" : ""}
            />
            {/* White diamond sparkle center */}
            <path
              d="M29 8 Q29 10.5 31 10.5 Q29 10.5 29 13 Q29 10.5 27 10.5 Q29 10.5 29 8 Z"
              fill="#ffffff"
              opacity="0.95"
            />
            {/* Small lilac diamond lower left */}
            <path
              d="M15 16 Q15 18 16.5 18 Q15 18 15 20 Q15 18 13.5 18 Q15 18 15 16 Z"
              fill="#c9b9ff"
              opacity="0.9"
            />
            {/* Tiny accent diamond */}
            <path
              d="M26 17 Q26 18.5 27 18.5 Q26 18.5 26 20 Q26 18.5 25 18.5 Q26 18.5 26 17 Z"
              fill="#ffffff"
              opacity="0.8"
            />
            {/* Micro stars */}
            <circle cx="8" cy="13" r="1" fill="#ffffff" opacity="0.85" />
            <circle cx="9" cy="21" r="0.75" fill="#ffd84a" opacity="0.7" />
            <circle cx="21" cy="6" r="0.7" fill="#ffffff" opacity="0.6" />
            <circle cx="36" cy="19" r="0.75" fill="#c9b9ff" opacity="0.65" />
          </svg>
        </div>

        {/* ================= THE SLIDING ORB (VOLT SUN -> LILAC MOON) ================= */}
        <div
          className="absolute top-[2px] size-[24px] rounded-full transition-all duration-500 ease-[cubic-bezier(.34,1.45,.55,1)] group-hover:scale-105"
          style={{
            left: night ? "calc(100% - 26px)" : "2px",
            backgroundColor: night ? "#c4c8d8" : "#ffd84a",
            boxShadow: night
              ? "0 2px 8px rgba(0,0,0,0.6), 0 0 10px rgba(131,90,252,0.4), inset -1px -1px 2px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(255,255,255,0.6)"
              : "0 2px 10px rgba(255,216,74,0.7), 0 0 12px rgba(255,216,74,0.4), inset -1px -1px 2px rgba(210,140,0,0.4), inset 1px 1px 2px rgba(255,255,255,0.8)",
          }}
        >
          {/* Volt Sun Crescent Edge & Core */}
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300"
            style={{ opacity: night ? 0 : 1 }}
          >
            {/* Crescent warm shadow on right */}
            <div className="absolute right-0 top-0.5 size-[22px] rounded-full border-r-[3.5px] border-b-[2px] border-amber-600/20" />
            {/* Center soft glow */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-white/70" />
          </div>

          {/* Lilac Moon Surface with Detailed Craters */}
          <div
            className="absolute inset-0 rounded-full transition-opacity duration-300"
            style={{ opacity: night ? 1 : 0 }}
          >
            {/* Moon soft rim lighting */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/40 via-transparent to-black/20" />

            {/* Crater 1 (large, top right) */}
            <span
              className="absolute right-1.5 top-1.5 size-2 rounded-full"
              style={{
                backgroundColor: "#959baf",
                boxShadow: "inset 0.5px 0.5px 1px rgba(0,0,0,0.4), 0 0.5px 1px rgba(255,255,255,0.3)",
              }}
            />
            {/* Crater 2 (medium, bottom left) */}
            <span
              className="absolute bottom-1.5 left-1.5 size-2 rounded-full"
              style={{
                backgroundColor: "#959baf",
                boxShadow: "inset 0.5px 0.5px 1px rgba(0,0,0,0.4), 0 0.5px 1px rgba(255,255,255,0.3)",
              }}
            />
            {/* Crater 3 (small, mid right) */}
            <span
              className="absolute bottom-2 right-1.5 size-1.5 rounded-full"
              style={{
                backgroundColor: "#959baf",
                boxShadow: "inset 0.5px 0.5px 1px rgba(0,0,0,0.4), 0 0.5px 1px rgba(255,255,255,0.3)",
              }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
