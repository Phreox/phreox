import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon, type IconName } from "../components/Icons.tsx";
import { Glow, InView } from "../components/InView.tsx";
import { Ripples } from "../components/Mock.tsx";
import { type Lang, useT } from "../i18n.ts";

type L = Record<Lang, string>;

interface FaqItem {
  id: string;
  cat: "voice" | "account" | "spaces" | "plans" | "general";
  q: L;
  a: L;
  tip?: L;
}

const faqs: FaqItem[] = [
  {
    id: "voice-noise",
    cat: "voice",
    q: { de: "Mein Mikrofon rauscht oder übersteuert – was kann ich tun?", en: "My microphone has noise or clips – what can I do?" },
    a: {
      de: "Gehe in der App in die Sound-Einstellungen. Stelle dort die Eingabe-Empfindlichkeit auf automatisch oder kalibriere sie manuell. Aktiviere die Rauschunterdrückung und führe den Mikrofon-Diagnosetest durch.",
      en: "Open Sound Settings in the app. Set input sensitivity to automatic or calibrate manually. Turn on noise suppression and run the microphone diagnosis test.",
    },
    tip: { de: "Tipp: Nutze Push-to-Talk in lauten Umgebungen.", en: "Tip: Use Push-to-Talk in noisy environments." },
  },
  {
    id: "voice-device",
    cat: "voice",
    q: { de: "Ich höre niemanden im Voice-Channel.", en: "I can't hear anyone in the voice channel." },
    a: {
      de: "Überprüfe dein Standard-Ausgabegerät in den Einstellungen. Stelle sicher, dass Phreox Zugriff auf deine Lautsprecher/Kopfhörer hat und prüfe, ob der Voice-Channel oder einzelne Nutzer stummgeschaltet sind.",
      en: "Check your default output device in settings. Ensure Phreox has speaker/headphone permissions and check if the voice channel or individual users are muted.",
    },
  },
  {
    id: "account-2fa",
    cat: "account",
    q: { de: "Wie richte ich Zwei-Faktor-Authentifizierung (2FA) ein?", en: "How do I set up two-factor authentication (2FA)?" },
    a: {
      de: "Öffne deine Benutzereinstellungen > Sicherheit > Zwei-Faktor-Authentifizierung aktivieren. Scanne den QR-Code mit einer Authenticator-App (z. B. Aegis, 2FAS, Google Authenticator) und speichere deine Backup-Codes an einem sicheren Ort.",
      en: "Open User Settings > Security > Enable Two-Factor Authentication. Scan the QR code with an authenticator app (e.g. Aegis, 2FAS, Google Authenticator) and save your backup codes in a safe place.",
    },
    tip: { de: "Wichtig: Ohne Backup-Codes kann der Support dein Konto bei Verlust nicht entsperren.", en: "Important: Without backup codes, support cannot unlock your account if lost." },
  },
  {
    id: "account-password",
    cat: "account",
    q: { de: "Ich habe mein Passwort vergessen – wie setze ich es zurück?", en: "I forgot my password – how do I reset it?" },
    a: {
      de: "Klicke im Login-Fenster auf 'Passwort vergessen' und gib deine E-Mail-Adresse ein. Du erhältst innerhalb weniger Minuten einen sicheren Bestätigungslink.",
      en: "Click 'Forgot password' on the login screen and enter your email. You will receive a secure confirmation link within minutes.",
    },
  },
  {
    id: "spaces-roles",
    cat: "spaces",
    q: { de: "Wie funktioniert die Rollenhierarchie (Einfach vs. Erweitert)?", en: "How does the role hierarchy work (Simple vs. Advanced)?" },
    a: {
      de: "Im einfachen Modus hast du übersichtliche Schalter pro Berechtigung wie bei Discord. Im erweiterten Modus kannst du numerische Power-Werte wie bei TeamSpeak vergeben: Wer einen höheren Power-Wert hat, kann Mitglieder mit niedrigerem Wert moderieren.",
      en: "In simple mode you have clear toggles per permission like Discord. In advanced mode you can assign numeric power values like TeamSpeak: higher power can moderate members with lower power.",
    },
  },
  {
    id: "spaces-invites",
    cat: "spaces",
    q: { de: "Wie erstelle ich einen benutzerdefinierten Einladungslink?", en: "How do I create a custom invite link?" },
    a: {
      de: "Öffne die Space-Einstellungen > Einladungen. Du kannst einen Vanity-Link wie phreox.talk/dein-name vergeben – das ist bei Phreox für jeden Space kostenlos!",
      en: "Open Space Settings > Invites. You can assign a custom vanity URL like phreox.talk/your-name – which is completely free for every space on Phreox!",
    },
  },
  {
    id: "plans-ember",
    cat: "plans",
    q: { de: "Was ist der Unterschied zwischen Ember, Volt und Glimmer?", en: "What is the difference between Ember, Volt and Glimmer?" },
    a: {
      de: "Ember (Kit, Fox, Kitsune) ist ein freiwilliges Abo für dein Profil (Uploads, Emojis, Streaming, monatliches Volt). Volt ist die Energie für deinen Space (hebt alle Mitglieder auf Stufen). Glimmer ist die kostenlose Währung, die du durch Aktivität erspielst und gegen Tage Ember oder Volt einlöst.",
      en: "Ember (Kit, Fox, Kitsune) is a voluntary subscription for your profile (uploads, emojis, streaming, monthly Volt). Volt is energy for your space (lifts all members across levels). Glimmer is the free currency earned by being active and redeemed for days of Ember or Volt.",
    },
  },
  {
    id: "plans-cancel",
    cat: "plans",
    q: { de: "Wie kann ich mein Ember-Abonnement kündigen?", en: "How can I cancel my Ember subscription?" },
    a: {
      de: "In der App unter Einstellungen > Ember > 'Abonnement verwalten' > 'Kündigen'. Du behältst alle Vorteile bis zum Ende des aktuellen Abrechnungszeitraums.",
      en: "In the app under Settings > Ember > 'Manage Subscription' > 'Cancel'. You keep all benefits until the end of your current billing period.",
    },
  },
  {
    id: "general-platforms",
    cat: "general",
    q: { de: "Auf welchen Plattformen läuft Phreox?", en: "Which platforms does Phreox run on?" },
    a: {
      de: "Phreox läuft nativ auf Windows (.exe), macOS (.dmg), Linux (.AppImage) und Android (.apk). Außerdem kannst du es ohne jede Installation direkt im Browser auf phreox.talk nutzen.",
      en: "Phreox runs natively on Windows (.exe), macOS (.dmg), Linux (.AppImage) and Android (.apk). You can also use it with zero installation in any modern browser on phreox.talk.",
    },
  },
  {
    id: "general-selfhost",
    cat: "general",
    q: { de: "Kann ich meinen eigenen Phreox-Voice-Server betreiben (Self-Hosting)?", en: "Can I host my own Phreox voice server (Self-Hosting)?" },
    a: {
      de: "Ja! Phreox unterstützt selbst gehostete Server. Auf eigener Hardware stehen dir 5 Volt-Stufen zur Verfügung, du kannst bis 4K mit 144 Hz streamen und behältst die volle Datenhoheit.",
      en: "Yes! Phreox supports self-hosted servers. On your own hardware you get 5 Volt levels, can stream up to 4K at 144 fps, and retain full data sovereignty.",
    },
  },
];

const categories = [
  { id: "all", label: { de: "Alle Themen", en: "All topics" }, icon: "book" as IconName },
  { id: "voice", label: { de: "Voice & Audio", en: "Voice & Audio" }, icon: "voice" as IconName },
  { id: "account", label: { de: "Konto & 2FA", en: "Account & 2FA" }, icon: "lock" as IconName },
  { id: "spaces", label: { de: "Spaces & Rollen", en: "Spaces & Roles" }, icon: "spaces" as IconName },
  { id: "plans", label: { de: "Ember, Volt & Glimmer", en: "Ember, Volt & Glimmer" }, icon: "bolt" as IconName },
  { id: "general", label: { de: "Allgemein & App", en: "General & App" }, icon: "globe" as IconName },
];

const quickPicks = [
  { label: "Mikrofon testen", query: "rauscht" },
  { label: "2FA einrichten", query: "Zwei-Faktor" },
  { label: "Rollen & Power-Werte", query: "Rollen" },
  { label: "Ember kündigen", query: "kündigen" },
  { label: "Eigener Server (Self-Host)", query: "Server" },
  { label: "Browser Version", query: "Browser" },
];

/**
 * Interactive Audio & Voice Tester Simulator.
 * Allows users to simulate input sensitivity calibration and noise filters.
 */
function VoiceLab() {
  const { lang } = useT();
  const de = lang === "de";
  const [testing, setTesting] = useState(false);
  const [level, setLevel] = useState(35);
  const [noiseFilter, setNoiseFilter] = useState(true);
  const [echoCancel, setEchoCancel] = useState(true);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!testing) return;
    const interval = setInterval(() => {
      setLevel(Math.floor(25 + Math.random() * 55));
    }, 120);
    return () => clearInterval(interval);
  }, [testing]);

  return (
    <div className="rounded-[2.25rem] border border-black/10 bg-(--paper) p-7 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-(--violet)/15 px-3 py-1 text-xs font-bold text-(--violet)">
            <Icon name="voice" className="size-4" />
            {de ? "INTERAKTIVER SOUND-CHECK" : "INTERACTIVE SOUND CHECK"}
          </span>
          <h3 className="display mt-2 text-3xl sm:text-4xl">{de ? "Audio & Mikrofon-Diagnose" : "Audio & Microphone Diagnosis"}</h3>
          <p className="mt-1 text-(--text-washed)">
            {de ? "Überprüfe Rauschfilter, Pegel und Latenz direkt hier im Browser." : "Verify noise filters, input levels and latency right here in the browser."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setTesting(!testing)}
          className={`btn text-base font-semibold transition active:scale-95 ${
            testing ? "bg-red-500 text-white hover:bg-red-600 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.5)]" : "btn-primary"
          }`}
        >
          {testing ? (de ? "Test beenden" : "Stop test") : (de ? "Mikrofon-Test starten" : "Start mic test")}
        </button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* Pegel-Meter */}
        <div className="rounded-2xl bg-white/60 p-5 ring-1 ring-black/5 dark:bg-white/5">
          <div className="flex justify-between text-sm font-semibold mb-2">
            <span>{de ? "Eingangspegel" : "Input Level"}</span>
            <span className="font-mono text-(--violet)">{testing ? `-${100 - level} dB` : "-∞ dB"}</span>
          </div>
          {/* Animated Equalizer bars */}
          <div className="flex h-10 items-end gap-1.5 rounded-xl bg-black/10 p-2 dark:bg-black/30">
            {Array.from({ length: 24 }).map((_, i) => {
              const active = testing && i * 4 <= level;
              const isPeak = i >= 20;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-all duration-75 ${
                    active
                      ? isPeak
                        ? "bg-amber-500 h-full"
                        : "bg-(--violet) h-full"
                      : "bg-black/15 h-1.5 dark:bg-white/10"
                  }`}
                  style={{
                    height: active ? `${Math.min(100, Math.max(15, (level / 100) * 100 - (24 - i) * 1.5))}%` : undefined,
                  }}
                />
              );
            })}
          </div>
          <p className="mt-3 text-xs text-(--text-dark)">
            {testing
              ? de
                ? "🟢 Pegel normal. Die Rauschunterdrückung filtert Hintergrundgeräusche heraus."
                : "🟢 Level normal. Noise suppression is active and filtering noise."
              : de
                ? "Klicke auf 'Test starten', um die Pegel-Simulation zu aktivieren."
                : "Click 'Start mic test' to activate the volume meter simulation."}
          </p>
        </div>

        {/* Filter-Toggles */}
        <div className="flex flex-col justify-center gap-3">
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10">
            <div>
              <p className="font-semibold">{de ? "Rauschunterdrückung" : "Noise Suppression"}</p>
              <p className="text-xs text-(--text-dark)">{de ? "Filtert Tastatur- und Lüftergeräusche" : "Filters keyboard and fan noise"}</p>
            </div>
            <input
              type="checkbox"
              checked={noiseFilter}
              onChange={() => setNoiseFilter(!noiseFilter)}
              className="size-5 accent-(--violet) cursor-pointer"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10">
            <div>
              <p className="font-semibold">{de ? "Echounterdrückung" : "Echo Cancellation"}</p>
              <p className="text-xs text-(--text-dark)">{de ? "Verhindert Audio-Rückkopplungen" : "Prevents audio feedback loops"}</p>
            </div>
            <input
              type="checkbox"
              checked={echoCancel}
              onChange={() => setEchoCancel(!echoCancel)}
              className="size-5 accent-(--violet) cursor-pointer"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

/**
 * Diagnostic copy helper for fast support tickets.
 */
function DiagnosticSnippet() {
  const { lang } = useT();
  const de = lang === "de";
  const [copied, setCopied] = useState(false);

  const getDiagnostics = () => {
    return [
      `Phreox Client Info: Web`,
      `User Agent: ${navigator.userAgent}`,
      `Screen: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio})`,
      `Language: ${navigator.language}`,
      `Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join("\n");
  };

  const copy = () => {
    navigator.clipboard.writeText(getDiagnostics());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-[2.25rem] border border-black/10 bg-(--paper) p-7 sm:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="display text-3xl">{de ? "System-Diagnose für Support kopieren" : "Copy System Diagnostics for Support"}</h3>
          <p className="mt-1 text-(--text-washed)">
            {de
              ? "Wenn du ein Ticket eröffnest, hilft dieser Diagnose-Auszug unserem Team, dein Problem schnell zu lokalisieren."
              : "When opening a ticket, this diagnostic snippet helps our team pinpoint your issue swiftly."}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn btn-ghost shrink-0 cursor-pointer active:scale-95 font-semibold"
        >
          {copied ? (de ? "✓ Kopiert!" : "✓ Copied!") : de ? "Diagnose kopieren" : "Copy diagnostics"}
        </button>
      </div>
      <div className="mt-5 rounded-2xl bg-[#0c0d14] p-4 font-mono text-xs text-[#d6d9ff] overflow-x-auto whitespace-pre border border-white/10">
        {getDiagnostics()}
      </div>
    </div>
  );
}

/**
 * Completely overhauled Support & Help Center page.
 */
export function Support() {
  const { lang } = useT();
  const de = lang === "de";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<string | null>("voice-noise");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to jump to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredFaqs = useMemo(() => {
    const q = query.toLowerCase().trim();
    return faqs.filter((item) => {
      const matchesCat = cat === "all" || item.cat === cat;
      const matchesQuery =
        !q ||
        item.q[lang].toLowerCase().includes(q) ||
        item.a[lang].toLowerCase().includes(q) ||
        (item.tip && item.tip[lang].toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [query, cat, lang]);

  return (
    <>
      {/* ================= HERO SEARCH BANNER ================= */}
      <section className="hero-bg relative overflow-hidden text-white">
        <Ripples className="pointer-events-none absolute -top-60 -right-48 w-[44rem] opacity-40" color="#fff" />
        <div className="relative mx-auto max-w-[84rem] px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-sm font-semibold backdrop-blur mb-4">
            <span className="size-2 rounded-full bg-[#57f287] animate-pulse" />
            {de ? "Hilfe & Wissensdatenbank" : "Help & Knowledge Base"}
          </div>

          <h1 className="display arrive text-[clamp(3rem,9vw,6.5rem)]">
            {de ? "Wie können wir helfen?" : "How can we help?"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 sm:text-xl">
            {de
              ? "Finde sofortige Antworten zu Voice, Rollen, Sicherheit und Abos – oder starte die Diagnose."
              : "Find instant answers for voice, roles, safety and subscriptions – or run diagnostics."}
          </p>

          {/* RADIANT SEARCH BAR */}
          <div className="relative mt-8 max-w-2xl">
            <label className="flex items-center gap-3.5 rounded-full bg-white px-6 py-4 text-[#23272f] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.6)] focus-within:ring-4 focus-within:ring-white/40 transition-all">
              <span className="text-xl opacity-60" aria-hidden="true">🔍</span>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (open && !filteredFaqs.some((f) => f.id === open)) {
                    setOpen(null);
                  }
                }}
                placeholder={de ? "Wonach suchst du? (Drücke '/' zum Suchen)" : "Search questions... (Press '/' to focus)"}
                className="w-full bg-transparent text-lg outline-none placeholder:text-black/40 font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="size-6 rounded-full bg-black/10 flex items-center justify-center text-xs font-bold text-black/60 hover:bg-black/20"
                >
                  ✕
                </button>
              )}
            </label>
          </div>

          {/* Quick topic pills */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="opacity-75">{de ? "Häufig gesucht:" : "Popular:"}</span>
            {quickPicks.map((pick) => (
              <button
                key={pick.label}
                type="button"
                onClick={() => {
                  setQuery(pick.query);
                  setCat("all");
                }}
                className="rounded-full bg-white/15 px-3 py-1 font-medium text-white transition hover:bg-white/30 active:scale-95"
              >
                {pick.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LIVE SYSTEM STATUS ================= */}
      <div className="mx-auto -mt-7 max-w-[84rem] px-5 relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-(--paper) p-4 sm:px-8 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#57f287] opacity-75" />
              <span className="relative inline-flex size-3 rounded-full bg-[#57f287]" />
            </span>
            <div>
              <p className="font-bold text-sm sm:text-base">
                {de ? "Alle Phreox-Systeme betriebsbereit" : "All Phreox systems operational"}
              </p>
              <p className="text-xs text-(--text-dark)">
                {de ? "Keine bekannten Vorfälle in den letzten 30 Tagen" : "Zero incidents reported in the last 30 days"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-(--text-dark)">
            <span>Voice FRA: <strong className="text-emerald-500">14ms</strong></span>
            <span>Gateway: <strong className="text-emerald-500">99.99%</strong></span>
            <span>Auth: <strong className="text-emerald-500">Active</strong></span>
          </div>
        </div>
      </div>

      {/* ================= 4 MAIN CATEGORY HUBS ================= */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Hilfe nach Bereich" : "Browse by Topic"}</h2>
          <p className="mt-2 text-lg text-(--text-washed)">
            {de ? "Detaillierte Leitfäden und Sofortlösungen für jeden Teil von Phreox." : "Detailed guides and instant answers for every part of Phreox."}
          </p>
        </InView>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "voice" as IconName,
              color: "#5865f2",
              title: { de: "Voice & Sound", en: "Voice & Audio" },
              desc: { de: "Headset-Kalibrierung, Rauschfilter, Push-to-Talk und Diagnose.", en: "Headset setup, noise filters, push-to-talk and diagnostics." },
              catId: "voice",
            },
            {
              icon: "lock" as IconName,
              color: "#eb459f",
              title: { de: "Konto & 2FA", en: "Account & 2FA" },
              desc: { de: "Zwei-Faktor-Schutz, Backup-Codes, Passwörter und Privatsphäre.", en: "Two-factor auth, backup codes, passwords and privacy." },
              catId: "account",
            },
            {
              icon: "spaces" as IconName,
              color: "#3ba55d",
              title: { de: "Spaces & Moderation", en: "Spaces & Roles" },
              desc: { de: "Channels sortieren, Berechtigungshierarchie und Vanity-Links.", en: "Channel categories, permission hierarchy and vanity URLs." },
              catId: "spaces",
            },
            {
              icon: "bolt" as IconName,
              color: "#ff7a45",
              title: { de: "Ember, Volt & Glimmer", en: "Ember & Volt" },
              desc: { de: "Stufen-Vorteile, Space-Energie, Belohnungen und Marktplatz.", en: "Tier perks, space boosts, rewards and marketplace." },
              catId: "plans",
            },
          ].map((item, idx) => (
            <InView as="div" key={item.catId} delay={idx * 80}>
              <button
                type="button"
                onClick={() => {
                  setCat(item.catId);
                  setQuery("");
                }}
                className="lift w-full h-full text-left cursor-pointer rounded-3xl border border-black/10 bg-(--paper) p-7 flex flex-col justify-between"
              >
                <div>
                  <span
                    className="flex size-14 items-center justify-center rounded-2xl text-white mb-6 shadow-md"
                    style={{ background: item.color }}
                  >
                    <Icon name={item.icon} className="size-8" />
                  </span>
                  <h3 className="display text-2xl">{item.title[lang]}</h3>
                  <p className="mt-2 text-sm text-(--text-washed)">{item.desc[lang]}</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-(--violet)">
                  {de ? "Artikel ansehen" : "View articles"} →
                </span>
              </button>
            </InView>
          ))}
        </div>
      </section>

      {/* ================= INTERACTIVE VOICE LAB ================= */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <VoiceLab />
        </InView>
      </section>

      {/* ================= FAQ ACCORDION ================= */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Häufige Fragen" : "Frequently Asked Questions"}</h2>
              <p className="mt-2 text-lg text-(--text-washed)">
                {de
                  ? `${filteredFaqs.length} Fragen gefunden ${cat !== "all" ? `für '${categories.find((c) => c.id === cat)?.label[lang]}'` : ""}`
                  : `${filteredFaqs.length} questions found ${cat !== "all" ? `for '${categories.find((c) => c.id === cat)?.label[lang]}'` : ""}`}
              </p>
            </div>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCat("all");
                }}
                className="text-sm font-semibold text-(--violet) hover:underline"
              >
                {de ? "Filter zurücksetzen" : "Clear filters"}
              </button>
            )}
          </div>
        </InView>

        {/* Category switcher pills */}
        <div className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95 flex items-center gap-2 ${
                cat === c.id ? "bg-(--violet) text-white shadow-md" : "bg-(--paper) text-(--text-washed) hover:text-(--ink)"
              }`}
            >
              <Icon name={c.icon} className="size-4" />
              {c.label[lang]}
            </button>
          ))}
        </div>

        {/* Accordion list */}
        <ul className="mt-8 flex flex-col gap-3">
          {filteredFaqs.map((item) => {
            const isOpen = open === item.id;
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-black/10 bg-(--paper) transition-all"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-7 py-5 text-left text-lg font-bold"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-(--violet)">•</span>
                    {item.q[lang]}
                  </span>
                  <span
                    className={`text-2xl text-(--violet) transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(.3,.8,.3,1)]"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden px-7 text-(--text-washed)">
                    <div className="pb-6">
                      <p className="text-base sm:text-lg leading-relaxed">{item.a[lang]}</p>
                      {item.tip && (
                        <div className="mt-3.5 rounded-xl bg-(--violet)/10 p-3.5 text-sm font-medium text-(--violet-deep) border border-(--violet)/20">
                          {item.tip[lang]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
          {filteredFaqs.length === 0 && (
            <li className="rounded-3xl border border-dashed border-black/20 p-12 text-center text-(--text-washed)">
              <p className="display text-2xl">{de ? "Keine passenden Fragen gefunden" : "No matching questions found"}</p>
              <p className="mt-2 text-sm">{de ? "Versuche einen anderen Suchbegriff oder setze den Filter zurück." : "Try a different search term or clear the filter."}</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCat("all");
                }}
                className="btn btn-primary btn-small mt-5"
              >
                {de ? "Alle Fragen anzeigen" : "Show all questions"}
              </button>
            </li>
          )}
        </ul>
      </section>

      {/* ================= DIAGNOSTICS & TICKET SNIPPET ================= */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <DiagnosticSnippet />
        </InView>
      </section>

      {/* ================= STILL HAVE QUESTIONS / CONTACT CARDS ================= */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <h2 className="display text-[clamp(2.2rem,5vw,4rem)]">{de ? "Noch Fragen offen?" : "Still need help?"}</h2>
          <p className="mt-2 text-lg text-(--text-washed)">
            {de ? "Unser Support-Team und die Community sind jederzeit erreichbar." : "Our support team and community are always reachable."}
          </p>
        </InView>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          <Glow className="lift rounded-3xl border border-black/10 bg-(--paper) p-7 flex flex-col justify-between">
            <div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-(--violet) text-white mb-5">
                <Icon name="chat" className="size-7" />
              </span>
              <h3 className="display text-2xl">{de ? "In-App Ticket" : "In-App Ticket"}</h3>
              <p className="mt-2 text-sm text-(--text-washed)">
                {de ? "Öffne ein Support-Ticket direkt in der Phreox-App für schnelle Hilfe durch Moderatoren." : "Open a support ticket directly inside the Phreox app for fast moderator help."}
              </p>
            </div>
            <a href="https://phreox.talk" className="btn btn-primary btn-small mt-6">
              {de ? "App öffnen" : "Open App"}
            </a>
          </Glow>

          <Glow className="lift rounded-3xl border border-black/10 bg-(--paper) p-7 flex flex-col justify-between">
            <div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-5">
                <Icon name="book" className="size-7" />
              </span>
              <h3 className="display text-2xl">{de ? "News & Updates" : "News & Updates"}</h3>
              <p className="mt-2 text-sm text-(--text-washed)">
                {de ? "Erfahre von neuen Releases, Patchnotes und geplanten Wartungsarbeiten." : "Learn about new releases, patch notes and scheduled maintenance."}
              </p>
            </div>
            <Link to="/news" className="btn btn-ghost btn-small mt-6">
              {de ? "News lesen" : "Read news"}
            </Link>
          </Glow>

          <Glow className="lift rounded-3xl border border-black/10 bg-(--paper) p-7 flex flex-col justify-between">
            <div>
              <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-500 text-white mb-5">
                <Icon name="lock" className="size-7" />
              </span>
              <h3 className="display text-2xl">{de ? "Sicherheits-Center" : "Safety Center"}</h3>
              <p className="mt-2 text-sm text-(--text-washed)">
                {de ? "Best Practices zum Schutz deines Accounts und zur Moderation deines Spaces." : "Best practices to secure your account and moderate your space."}
              </p>
            </div>
            <Link to="/safety" className="btn btn-ghost btn-small mt-6">
              {de ? "Sicherheit ansehen" : "View safety"}
            </Link>
          </Glow>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <InView className="mx-auto mt-24 max-w-[84rem] px-5">
        <div className="hero-bg relative overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-14">
          <Ripples className="pointer-events-none absolute -right-32 top-1/2 w-[30rem] -translate-y-1/2 opacity-40" color="#fff" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="display text-[clamp(2.4rem,6vw,4.5rem)]">{de ? "Bereit für Phreox?" : "Ready for Phreox?"}</h2>
              <p className="mt-3 max-w-md text-white/90">
                {de ? "Starte jetzt kostenlos im Browser oder lade die App für dein System herunter." : "Start free in your browser now or download the app for your system."}
              </p>
            </div>
            <Link to="/download" className="btn btn-light text-lg">
              {de ? "Phreox laden" : "Get Phreox"}
              <Icon name="arrow" className="size-5" />
            </Link>
          </div>
        </div>
      </InView>
    </>
  );
}
