import { useMemo, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useEffect, useRef } from "react";
import { Icon, type IconName } from "../components/Icons.tsx";
import { Glow, InView } from "../components/InView.tsx";
import { Ripples } from "../components/Mock.tsx";
import { type Lang, useT } from "../i18n.ts";
import { CompareTable, FeatureRows, PlanFaq, Platforms, SafetyCheck, Section, Steps, Streak, VoltCalc } from "./Extras.tsx";

type L = Record<Lang, string>;

/** The top of every information page: a bright banner with the title. */
function Banner({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <section className="hero-bg relative overflow-hidden text-white">
      <Ripples className="pointer-events-none absolute -top-60 -right-48 w-[44rem] opacity-40" color="#fff" />
      <div className="relative mx-auto max-w-[84rem] px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <h1 className="display arrive text-[clamp(3rem,9vw,7rem)]">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-white/90 sm:text-xl">{text}</p>
        {children}
      </div>
    </section>
  );
}

const colors = ["#5865f2", "#eb459f", "#3ba55d", "#f0a020", "#7a5af8", "#0ea5e9"];

function Cards({ items }: { items: { icon: IconName; title: L; text: L; to?: string }[] }) {
  const { lang } = useT();

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const body = (
          <Glow className="lift h-full rounded-3xl border border-black/10 bg-(--paper) p-7">
            <span className="flex size-14 items-center justify-center rounded-2xl text-white" style={{ background: colors[index % colors.length] }}><Icon name={item.icon} className="size-8" /></span>
            <h3 className="display mt-5 text-3xl">{item.title[lang]}</h3>
            <p className="mt-2 text-(--text-washed)">{item.text[lang]}</p>
          </Glow>
        );

        return <InView as="li" key={item.title.en} delay={(index % 3) * 90}>{item.to ? <Link to={item.to} className="block h-full">{body}</Link> : body}</InView>;
      })}
    </ul>
  );
}

function Cta({ title, text, to, label }: { title: string; text: string; to: string; label: string }) {
  return (
    <InView className="mx-auto mt-24 max-w-[84rem] px-5">
      <div className="hero-bg relative overflow-hidden rounded-[2.5rem] p-8 text-white sm:p-14">
        <Ripples className="pointer-events-none absolute -right-32 top-1/2 w-[30rem] -translate-y-1/2 opacity-40" color="#fff" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="display text-[clamp(2.4rem,6vw,4.5rem)]">{title}</h2><p className="mt-3 max-w-md text-white/90">{text}</p></div>
          <Link to={to} className="btn btn-light text-lg">{label}<Icon name="arrow" className="size-5" /></Link>
        </div>
      </div>
    </InView>
  );
}

const features: { icon: IconName; title: L; text: L }[] = [
  { icon: "chat", title: { de: "Chats & Gruppen", en: "Chats & groups" }, text: { de: "1:1 oder in Gruppen schreiben, mit Markdown, Emojis und Anrufverlauf im Chat.", en: "Write 1:1 or in groups, with Markdown, emojis and the call history in the chat." } },
  { icon: "spaces", title: { de: "Spaces", en: "Spaces" }, text: { de: "Kategorien, Text-, Ankündigungs- und Voice-Channels, per Drag & Drop sortiert. Logo, Banner und eigener Einladungslink.", en: "Categories, text, announcement and voice channels, sorted by drag & drop. Logo, banner and your own invite link." } },
  { icon: "roles", title: { de: "Rollen & Rechte", en: "Roles & permissions" }, text: { de: "Einfache Schalter oder Power-Werte wie bei TeamSpeak. Farben und Verläufe sind immer gratis.", en: "Simple switches or TeamSpeak-style power values. Colours and gradients are always free." } },
  { icon: "voice", title: { de: "Voice & Anrufe", en: "Voice & calls" }, text: { de: "Lautstärke und Qualität pro Gerät, eine Diagnose bei Rauschen, verpasste Anrufe im Chat.", en: "Volume and quality per device, a diagnosis for noise, missed calls in the chat." } },
  { icon: "bolt", title: { de: "Volt", en: "Volt" }, text: { de: "Spaces sammeln Volt und schalten Emojis, Uploads, Streaming und Sprachqualität frei.", en: "Spaces collect Volt and unlock emojis, uploads, streaming and voice quality." } },
  { icon: "globe", title: { de: "Überall", en: "Everywhere" }, text: { de: "Windows, macOS, Linux, Android und im Browser mit demselben Account.", en: "Windows, macOS, Linux, Android and the browser with the same account." } },
  { icon: "lock", title: { de: "Konto-Schutz", en: "Account security" }, text: { de: "Zwei-Faktor-Anmeldung schützt dein Konto zusätzlich.", en: "Two-factor sign-in protects your account further." } },
  { icon: "palette", title: { de: "Dein Stil", en: "Your style" }, text: { de: "Rollenfarben, Verläufe und Bilder machen deinen Space unverwechselbar.", en: "Role colours, gradients and images make your space stand out." } },
  { icon: "megaphone", title: { de: "Ankündigungen", en: "Announcements" }, text: { de: "Willkommens- und Ankündigungs-Channels halten alle auf dem Laufenden.", en: "Welcome and announcement channels keep everyone in the loop." } },
];

export function Features() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <>
      <Banner title={de ? "Alles, was du brauchst" : "Everything you need"} text={de ? "Von der ersten Nachricht bis zum großen Space: Das steckt in Phreox." : "From the first message to the big space: this is what Phreox does."} />
      <div className="mx-auto mt-16 max-w-[84rem] px-5">
        <Cards items={features} />
      </div>

      <div className="mx-auto mt-24 max-w-[84rem] px-5">
        <InView>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Im Detail gebaut" : "Crafted in detail"}</h2>
          <p className="mt-3 max-w-2xl text-lg text-(--text-washed)">{de ? "Echte Werkzeuge für deine Community: Voice-Qualität, Rollenhierarchie und Space-Energie." : "Real tools for your community: voice quality, role hierarchy and space energy."}</p>
        </InView>
      </div>
      <FeatureRows />

      <Section
        title={de ? "Dein Space, deine Struktur" : "Your space, your structure"}
        text={de ? "Gestalte Channels, Kategorien und Berechtigungen genau so, wie es für deine Gruppe passt." : "Design channels, categories and permissions exactly how it fits your group."}
      >
        <Steps items={[
          { icon: "spaces", title: { de: "1. Channels ordnen", en: "1. Organize channels" }, text: { de: "Mische Text-, Ankündigungs- und Voice-Channels in übersichtlichen Kategorien.", en: "Combine text, announcement and voice channels in neat categories." } },
          { icon: "roles", title: { de: "2. Rechte zuteilen", en: "2. Assign permissions" }, text: { de: "Nutze einfache Schalter oder differenzierte Power-Werte für maximale Kontrolle.", en: "Use simple switches or granular power values for full control." } },
          { icon: "globe", title: { de: "3. Einladen & loslegen", en: "3. Invite & connect" }, text: { de: "Teile deinen Einladungslink und sei überall auf jedem Gerät direkt erreichbar.", en: "Share your invite link and be reachable directly on any device." } },
        ]} />
      </Section>

      <Section
        title={de ? "Überall einsatzbereit" : "Ready on every platform"}
        text={de ? "Egal ob Desktop, Smartphone oder spontan im Web: Phreox ist immer dabei." : "Whether desktop, smartphone or on the web: Phreox is always with you."}
      >
        <Platforms />
      </Section>

      <Cta title={de ? "Probier es aus." : "Try it out."} text={de ? "Kostenlos, im Browser oder als App." : "Free, in the browser or as an app."} to="/download" label={de ? "Phreox laden" : "Get Phreox"} />
    </>
  );
}

export { Support } from "./Support.tsx";

export function Safety() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <>
      <Banner title={de ? "Sicher zusammen" : "Safe together"} text={de ? "Werkzeuge und Tipps, damit sich in deinem Space alle wohlfühlen." : "Tools and tips so that everyone feels at home in your space."} />
      <div className="mx-auto mt-16 max-w-[84rem] px-5">
        <Cards items={[
          { icon: "lock", title: { de: "Zwei-Faktor-Anmeldung", en: "Two-factor sign-in" }, text: { de: "Schütze dein Konto mit einem zweiten Faktor.", en: "Protect your account with a second factor." } },
          { icon: "roles", title: { de: "Rollen & Rechte", en: "Roles & permissions" }, text: { de: "Gib nur die Rechte, die jemand braucht. Mitglieder kicken und Einladungen verwalten kannst du gezielt vergeben.", en: "Only give the permissions someone needs. Kicking members and managing invites can be assigned precisely." } },
          { icon: "users", title: { de: "Einladungen kontrollieren", en: "Control invites" }, text: { de: "Teile Einladungslinks nur dort, wo du es willst.", en: "Share invite links only where you want to." } },
          { icon: "megaphone", title: { de: "Probleme melden", en: "Report problems" }, text: { de: "Melde Missbrauch dem Support, wir schauen es uns an.", en: "Report abuse to support and we will look into it." }, to: "/support" },
          { icon: "book", title: { de: "Regeln für deinen Space", en: "Rules for your space" }, text: { de: "Nutze den Regeln-Channel, damit alle die Spielregeln kennen.", en: "Use a rules channel so everyone knows the ground rules." } },
          { icon: "sparkles", title: { de: "Fair für alle", en: "Fair for everyone" }, text: { de: "Wichtige Funktionen wie Farben und Einladungs-URL bleiben kostenlos.", en: "Key features such as colours and invite URLs stay free." } },
        ]} />
      </div>

      <div className="mx-auto mt-20 max-w-[84rem] px-5">
        <InView>
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Interaktiver Space-Check" : "Interactive space check"}</h2>
          <p className="mt-3 max-w-2xl text-lg text-(--text-washed)">{de ? "Hake ab, welche Schutzmaßnahmen du in deinem Space bereits umgesetzt hast." : "Check off which safety measures you already have in place in your space."}</p>
        </InView>
        <div className="mt-8">
          <SafetyCheck />
        </div>
      </div>

      <Section
        title={de ? "Best Practices für Moderatoren" : "Best practices for moderators"}
        text={de ? "Drei Grundsätze für eine gesunde, aktive und sichere Community." : "Three principles for a healthy, vibrant and safe community."}
      >
        <Steps items={[
          { icon: "roles", title: { de: "Weniger ist mehr", en: "Principle of least privilege" }, text: { de: "Vergib Administrator- und Moderationsrechte sparsam und nur an vertraute Personen.", en: "Grant admin and mod rights sparingly and only to trusted people." } },
          { icon: "megaphone", title: { de: "Klare Erwartungen", en: "Clear expectations" }, text: { de: "Ein leicht lesbarer Regeln-Channel schafft Transparenz bei Verstößen und Beschwerden.", en: "A clear rules channel provides transparency for violations and feedback." } },
          { icon: "lock", title: { de: "Schnell handeln", en: "Act fast" }, text: { de: "Entziehe Einladungslinks bei Verdacht auf Spam und nutze temporäre Rollen.", en: "Revoke invite links when suspecting spam and use temporary roles." } },
        ]} />
      </Section>

      <Cta title={de ? "Brauchst du Hilfe?" : "Need help?"} text={de ? "Unser Support ist für dich da." : "Our support is here for you."} to="/support" label="Support" />
    </>
  );
}

export function About() {
  const { lang } = useT();
  const de = lang === "de";

  const stats: [string, string, string][] = [
    ["100%", de ? "Werbefrei" : "Ad-free", de ? "Keine Tracker, keine Banner, kein Datenverkauf" : "No tracking, no banners, no data selling"],
    ["0 €", de ? "Basis-Kosten" : "Base cost", de ? "Rollenfarben, Channels und Voice bleiben für alle frei" : "Role colors, channels and voice stay free for everyone"],
    ["5", de ? "Plattformen" : "Platforms", de ? "Windows, macOS, Linux, Android und moderner Web-Browser" : "Windows, macOS, Linux, Android and modern web browser"],
    ["4K", de ? "Streaming-Qualität" : "Stream quality", de ? "Kristallklarer Sound und scharfe Streams für Spaces" : "Crystal-clear sound and sharp streams for spaces"],
  ];

  return (
    <>
      <Banner title={de ? "Für Leute, die gern zusammen sind" : "For people who like being together"} text={de ? "Phreox ist ein Ort zum Reden, Bauen und Zusammensein: unabhängig, schnell und fair gestaltet." : "Phreox is a place to talk, build and hang out: independent, fast and fairly designed."} />
      <div className="mx-auto mt-16 max-w-[84rem] px-5">
        <Cards items={[
          { icon: "headphones", title: { de: "Reden", en: "Talk" }, text: { de: "Chats und Voice, die gut klingen.", en: "Chats and voice that sound good." } },
          { icon: "spaces", title: { de: "Bauen", en: "Build" }, text: { de: "Spaces mit Channels, Rollen und deinem Stil.", en: "Spaces with channels, roles and your style." } },
          { icon: "users", title: { de: "Zusammen", en: "Together" }, text: { de: "Deine Leute sind auf jedem Gerät dabei.", en: "Your people come along on every device." } },
        ]} />
      </div>

      {/* Stats counter */}
      <section className="mx-auto mt-20 max-w-[84rem] px-5">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(([num, title, desc]) => (
            <InView as="li" key={title}>
              <div className="lift rounded-3xl border border-black/10 bg-(--paper) p-6 text-center">
                <p className="display text-[clamp(2.5rem,5vw,4rem)] text-(--violet)">{num}</p>
                <p className="display mt-1 text-xl">{title}</p>
                <p className="mt-2 text-sm text-(--text-washed)">{desc}</p>
              </div>
            </InView>
          ))}
        </ul>
      </section>

      {/* Philosophy */}
      <Section
        title={de ? "Unsere Prinzipien" : "Our principles"}
        text={de ? "Warum wir Phreox bauen und wie wir uns von klassischen Plattformen unterscheiden." : "Why we build Phreox and how we differ from traditional platforms."}
      >
        <Steps items={[
          { icon: "sparkles", title: { de: "Keine Paywalls fürs Wesentliche", en: "No paywalls on essentials" }, text: { de: "Wer seinem Rang eine Farbe oder einen Verlauf geben will, zahlt dafür keinen Cent. Individualität gehört allen.", en: "Anyone wanting a role color or gradient pays nothing. Customization belongs to everyone." } },
          { icon: "spaces", title: { de: "Freiheit durch Self-Hosting", en: "Freedom through self-hosting" }, text: { de: "Lass deinen Space auf eigenen Servern laufen, mit bis zu 5 Stufen und maximaler Bandbreite.", en: "Run your space on your own servers with up to 5 tiers and maximum bandwidth." } },
          { icon: "lock", title: { de: "Ehrliche Privatsphäre", en: "Honest privacy" }, text: { de: "Keine undurchsichtigen Algorithmen, kein Tracking für Werbenetzwerke und voller Schutz mit 2FA.", en: "No opaque algorithms, no ad tracking and complete protection with 2FA." } },
        ]} />
      </Section>

      <Cta title={de ? "Komm rein." : "Come on in."} text={de ? "Dein Account ist in einer Minute da." : "Your account is ready in a minute."} to="/download" label={de ? "Phreox laden" : "Get Phreox"} />
    </>
  );
}

const legal = {
  privacy: { de: ["Datenschutz", "Hier steht die Datenschutzerklärung von Phreox."], en: ["Privacy", "The privacy policy of Phreox goes here."] },
  terms: { de: ["Nutzungsbedingungen", "Hier stehen die Nutzungsbedingungen von Phreox."], en: ["Terms of service", "The terms of service of Phreox go here."] },
  imprint: { de: ["Impressum", "Hier stehen die Anbieterangaben von Phreox."], en: ["Imprint", "The provider details of Phreox go here."] },
} as const;

/** The legal pages are placeholders: the real texts have to come from the owner. */
export function Legal({ page }: { page: keyof typeof legal }) {
  const { lang } = useT();
  const [title, text] = legal[page][lang];

  return (
    <section className="mx-auto max-w-3xl px-5 pt-16 sm:pt-24">
      <h1 className="display text-[clamp(3rem,9vw,6rem)]">{title}</h1>
      <p className="mt-6 rounded-2xl border border-dashed border-black/20 bg-(--paper) p-6 text-(--text-washed)">{text}<br />{lang === "de" ? "Dieser Text ist noch nicht eingetragen." : "This text has not been added yet."}</p>
    </section>
  );
}

export function NotFound() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:py-32">
      <p className="display float text-[clamp(7rem,28vw,16rem)] text-(--violet)">404</p>
      <h1 className="display text-4xl">{de ? "Hier ist nichts." : "Nothing here."}</h1>
      <p className="mt-3 text-(--text-washed)">{de ? "Die Seite gibt es nicht oder nicht mehr." : "This page does not exist, or not any more."}</p>
      <Link to="/" className="btn btn-primary mt-8">{de ? "Zur Startseite" : "Back home"}</Link>
    </section>
  );
}

const ember = [
  { name: "Kit", color: "#ffb366", price: "2,99", tag: { de: "Mehr Platz für den Alltag.", en: "More room for everyday life." }, perks: { de: ["20 Spaces beitreten, 3 eigene", "100 eigene Emojis", "Streaming bis 1080p60 (bald)", "Uploads bis 50 MB", "Bilder bis 1920px", "2 Volt pro Monat", "Nachrichten bis 2500 Zeichen", "Abzeichen „Kit“ auf deinem Profil"], en: ["Join 20 spaces, own 3", "100 custom emojis", "Streaming up to 1080p60 (soon)", "Uploads up to 50 MB", "Images up to 1920px", "2 Volt per month", "Messages up to 2500 characters", "“Kit” badge on your profile"] } },
  { name: "Fox", color: "#ff7a45", price: "5,99", popular: true, tag: { de: "Für alle, die Spaces und Communities bauen.", en: "For everyone who builds spaces and communities." }, perks: { de: ["50 Spaces beitreten, 10 eigene", "150 eigene Emojis", "Streaming bis 2K60 (bald)", "Uploads bis 100 MB", "Bilder bis 2560px", "3 Volt pro Monat", "Nachrichten bis 3000 Zeichen", "Abzeichen „Fox“ auf deinem Profil"], en: ["Join 50 spaces, own 10", "150 custom emojis", "Streaming up to 2K60 (soon)", "Uploads up to 100 MB", "Images up to 2560px", "3 Volt per month", "Messages up to 3000 characters", "“Fox” badge on your profile"] } },
  { name: "Kitsune", color: "#ff7fae", price: "9,99", tag: { de: "Für Streamer: alles auf Maximum, bis 4K60.", en: "For streamers: everything at maximum, up to 4K60." }, perks: { de: ["100 Spaces beitreten, 25 eigene", "200 eigene Emojis", "Streaming bis 4K60 (bald)", "Uploads bis 500 MB", "Bilder bis 3840px", "4 Volt pro Monat", "Nachrichten bis 4000 Zeichen", "Abzeichen „Kitsune“ auf deinem Profil", "Zwei Erinnerungsstücke: Neun Schweife und Kitsune-Aura"], en: ["Join 100 spaces, own 25", "200 custom emojis", "Streaming up to 4K60 (soon)", "Uploads up to 500 MB", "Images up to 3840px", "4 Volt per month", "Messages up to 4000 characters", "“Kitsune” badge on your profile", "Two keepsakes: Nine Tails and Kitsune aura"] } },
];

const levels = [
  { name: { de: "Stufe 1", en: "Level 1" }, from: 2, perks: { de: ["50 Server-Emojis", "Streaming bis 720p60", "Bilder als Rollen-Symbole", "Space-Banner"], en: ["50 server emojis", "Streaming up to 720p60", "Images as role icons", "Space banner"] } },
  { name: { de: "Stufe 2", en: "Level 2" }, from: 5, perks: { de: ["100 Server-Emojis", "Streaming bis 1080p30", "Öffentliche Entdeckung"], en: ["100 server emojis", "Streaming up to 1080p30", "Public discovery"] } },
  { name: { de: "Stufe 3", en: "Level 3" }, from: 10, perks: { de: ["150 Server-Emojis", "Streaming bis 1080p60", "Animiertes Icon und Banner"], en: ["150 server emojis", "Streaming up to 1080p60", "Animated icon and banner"] } },
];

/** What a pass costs in Glimmer: [3 days, 7 days, 30 days]. */
const costs: Record<string, [number, number, number]> = { Kit: [60, 130, 450], Fox: [120, 260, 900], Kitsune: [200, 440, 1500], "1 Volt": [40, 90, 300], "2 Volt": [80, 180, 600], "3 Volt": [120, 270, 900] };
const days = [3, 7, 30];

const tasks: { icon: IconName; text: L; reward: number; done: number; of: number }[] = [
  { icon: "check", text: { de: "Täglich vorbeischauen", en: "Check in daily" }, reward: 5, done: 1, of: 1 },
  { icon: "chat", text: { de: "10 Nachrichten schreiben", en: "Write 10 messages" }, reward: 6, done: 2, of: 10 },
  { icon: "sparkles", text: { de: "5 Mal reagieren", en: "React 5 times" }, reward: 4, done: 0, of: 5 },
  { icon: "voice", text: { de: "20 Minuten aktiv sein", en: "Be active for 20 minutes" }, reward: 8, done: 20, of: 20 },
];

function Heading({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <InView className="mt-24">
      <h2 className="display text-[clamp(2.6rem,6vw,5rem)]" style={{ color }}>{title}</h2>
      <p className="mt-3 max-w-3xl text-lg text-(--text-washed)">{text}</p>
    </InView>
  );
}

const planPages = [
  { to: "/ember", name: "Ember", color: "#ff7a45" },
  { to: "/volt", name: "Volt", color: "#5865f2" },
  { to: "/glimmer", name: "Glimmer", color: "#e0a30c" },
];

/** Animates its own height to the height of its content, so a shorter text does not make the page jump. */
function AutoHeight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const node = inner.current;
    if (!node) return;

    const observer = new ResizeObserver(() => setHeight(node.offsetHeight));
    observer.observe(node);
    setHeight(node.offsetHeight);

    return () => observer.disconnect();
  }, []);

  return <div className={`overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(.3,.8,.3,1)] ${className}`} style={{ height }}><div ref={inner}>{children}</div></div>;
}

/** The frame of the three pages as a layout route: it stays mounted when you switch, so the pill glides and only the content changes. */
export function PlanLayout() {
  const { lang } = useT();
  const de = lang === "de";
  const path = useLocation().pathname;
  const current = planPages.find((page) => path.startsWith(page.to)) ?? planPages[0];
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [box, setBox] = useState({ left: 4, width: 0 });
  const texts: Record<string, string> = {
    Ember: de ? "Mehr Platz und schärfere Streams für dich, mehr Power für deine Spaces. Freiwillig: Phreox bleibt für alle nutzbar." : "More room and sharper streams for you, more power for your spaces. Voluntary: Phreox stays usable for everyone.",
    Volt: de ? "Power für deine Spaces: Jede Stufe schaltet etwas für alle im Space frei." : "Power for your spaces: each level unlocks something for everyone in the space.",
    Glimmer: de ? "Eine Währung, die man erspielt, nicht kauft. Fürs Benutzen von Phreox und für Freunde, einlösbar gegen Tage Ember und Volt." : "A currency you play for, not buy. For using Phreox and for friends, redeemable for days of Ember and Volt.",
  };

  useEffect(() => {
    const node = refs.current[current.name];
    if (node) setBox({ left: node.offsetLeft, width: node.offsetWidth });
  }, [current.name, lang]);

  return (
    <>
      <section className="hero-bg relative overflow-hidden text-white">
        <Ripples className="pointer-events-none absolute -top-60 -right-48 w-[44rem] opacity-40" color="#fff" />
        <div className="relative mx-auto max-w-[84rem] px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <h1 key={current.name} className="display arrive text-[clamp(3rem,9vw,7rem)]">{current.name}</h1>
          <AutoHeight className="mt-5 max-w-2xl"><p key={`${current.name}-text`} className="arrive text-lg text-white/90 sm:text-xl">{texts[current.name]}</p></AutoHeight>
          <div className="relative mt-8 inline-flex rounded-full bg-white/20 p-1 backdrop-blur">
            <span className="absolute inset-y-1 rounded-full bg-white shadow-lg" style={{ left: box.left, width: box.width, transition: "left 450ms cubic-bezier(.3,.8,.3,1), width 450ms cubic-bezier(.3,.8,.3,1)" }} />
            {planPages.map((page) => (
              <Link key={page.to} to={page.to} ref={(node) => { refs.current[page.name] = node; }} className={`relative z-10 rounded-full px-5 py-2 font-semibold transition-colors duration-300 ${page.name === current.name ? "text-[#23272f]" : "text-white"}`}>{page.name}</Link>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-10 max-w-[84rem] px-5 pb-4"><Outlet /></div>
      <Cta title={de ? "Bleib kostenlos oder zünde auf." : "Stay free or ignite."} text={de ? "Dein Profil zu gestalten bleibt für alle gratis." : "Customising your profile stays free for everyone."} to="/download" label={de ? "Phreox laden" : "Get Phreox"} />
    </>
  );
}

/** Ember: the subscription for people. */
export function EmberPage() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <div className="plan-page">
        <Heading title="Ember" color="#ff7a45" text={de ? "Mehr Platz und schärfere Streams für dich, mehr Power für deine Spaces. Dein Profil zu gestalten bleibt kostenlos: Dekorationen, Schriften, Namensfarben und Verläufe, Banner, GIFs und Links gibt es für alle." : "More room and sharper streams for you, more power for your spaces. Customising your profile stays free: decorations, fonts, name colours and gradients, banners, GIFs and links are for everyone."} />
        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {ember.map((tier, index) => (
            <InView as="li" key={tier.name} delay={index * 110}>
              <Glow className="lift relative flex h-full flex-col rounded-[2rem] border border-black/10 bg-(--paper) p-7">
                {tier.popular && <span className="absolute top-5 right-5 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: tier.color }}>{de ? "Beliebt" : "Popular"}</span>}
                <span className="flex size-12 items-center justify-center rounded-2xl text-white" style={{ background: tier.color }}><Icon name="fire" className="size-7" /></span>
                <h3 className="display mt-4 text-4xl" style={{ color: tier.color }}>{tier.name}</h3>
                <p className="text-sm text-(--text-dark)">{tier.tag[lang]}</p>
                <p className="display mt-5 text-5xl">{tier.price} € <span className="font-sans text-base font-normal text-(--text-dark)">{de ? "pro Monat" : "per month"}</span></p>
                <ul className="mt-5 mb-7 flex flex-1 flex-col gap-2.5">
                  {tier.perks[lang].map((perk) => <li key={perk} className="flex items-start gap-2.5 text-sm"><Icon name="check" className="mt-0.5 size-4 shrink-0" style={{ color: tier.color }} /><span>{perk}</span></li>)}
                </ul>
                <a href="https://phreox.talk" className="btn btn-primary w-full text-[#23272f]" style={{ background: tier.color, boxShadow: `0 10px 24px -10px ${tier.color}` }}>{de ? `${tier.name} holen` : `Get ${tier.name}`}</a>
              </Glow>
            </InView>
          ))}
        </ul>
        <InView className="mt-8">
          <Glow className="lift rounded-[2rem] border border-black/10 bg-(--paper) p-7 sm:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#3ba55d] text-white shadow-[0_8px_20px_-6px_#3ba55d]">
                  <Icon name="sparkles" className="size-8" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="display text-4xl text-[#3ba55d]">{de ? "Basis" : "Base"}</h3>
                    <span className="rounded-full bg-[#3ba55d]/15 px-3 py-1 text-xs font-bold text-[#3ba55d] ring-1 ring-[#3ba55d]/30">
                      {de ? "Das bleibt so" : "That stays"}
                    </span>
                  </div>
                  <p className="mt-1 text-base text-(--text-washed)">
                    {de
                      ? "Für alle, immer uneingeschränkt kostenlos. Ohne Werbung, ohne Paywall für Basisfunktionen."
                      : "For everyone, always fully free. No ads, no paywall on core features."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="display text-4xl text-(--ink)">0 €</span>
                  <span className="text-sm font-medium text-(--text-washed)">
                    {de ? "für immer" : "forever"}
                  </span>
                </div>
                <Link
                  to="/download"
                  className="btn btn-ghost ring-1 ring-black/10 hover:ring-(--violet) transition-all text-sm font-semibold"
                >
                  {de ? "Kostenlos starten" : "Start for free"}
                  <Icon name="arrow" className="size-4" />
                </Link>
              </div>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {([
                ["spaces", "10", de ? "Spaces, 1 eigener" : "spaces, 1 own"],
                ["sparkles", "50", de ? "Emojis" : "emojis"],
                ["rocket", "1080p30", de ? "Streaming" : "streaming"],
                ["download", "10 MB", "Uploads"],
                ["chat", "2000", de ? "Zeichen pro Nachricht" : "characters per message"],
              ] as [IconName, string, string][]).map(([icon, value, label]) => (
                <li
                  key={label}
                  className="lift rounded-2xl bg-white/60 p-4 ring-1 ring-black/5 flex flex-col justify-between"
                >
                  <Icon name={icon} className="size-6 text-(--violet)" />
                  <div className="mt-3">
                    <p className="display text-3xl">{value}</p>
                    <p className="mt-0.5 text-xs text-(--text-dark)">{label}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Glow>
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Alle Stufen im Vergleich" : "Compare all tiers"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "Klicke auf eine Spalte, um sie hervorzuheben." : "Click a column to highlight it."}</p>
          <CompareTable />
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Häufige Fragen zu Ember" : "Frequently asked questions"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "Alles Wichtige rund um Mitgliedschaft und Abos." : "Everything you need to know about membership and subscriptions."}</p>
          <PlanFaq page="ember" />
        </InView>

    </div>
  );
}

/** Volt: the power for spaces. */
export function VoltPage() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <div className="plan-page">
        <Heading title="Volt" color="#5865f2" text={de ? "Jeder Space hat eine eigene Energie. Mit dem Volt, das du als Ember-Mitglied jeden Monat bekommst, hebst du einen Space auf bis zu 3 Stufen (bis 1080p60). Jede Stufe schaltet etwas für alle im Space frei." : "Every space has its own energy. With the Volt you get every month as an Ember member you lift a space up to 3 levels (up to 1080p60). Each level unlocks something for everyone in the space."} />
        <ul className="mt-10 grid gap-6 lg:grid-cols-3">
          {levels.map((level, index) => (
            <InView as="li" key={level.from} delay={index * 110}>
              <Glow className="lift h-full rounded-[2rem] border border-black/10 bg-(--paper) p-7">
                <h3 className="display text-4xl">{level.name[lang]}</h3>
                <p className="mt-1 flex items-center gap-1.5 font-semibold text-(--violet)"><Icon name="bolt" className="size-5" />{de ? `ab ${level.from} Volt` : `from ${level.from} Volt`}</p>
                <ul className="mt-5 flex flex-col gap-2.5">{level.perks[lang].map((perk) => <li key={perk} className="flex items-start gap-2.5"><Icon name="check" className="mt-1 size-4 shrink-0" />{perk}</li>)}</ul>
              </Glow>
            </InView>
          ))}
        </ul>
        <InView className="mt-6">
          <div className="rounded-[2rem] border border-black/10 bg-(--paper) p-7">
            <h3 className="display text-3xl">{de ? "Mehr Volt kaufen" : "Buy more Volt"}</h3>
            <p className="mt-1 text-(--text-washed)">{de ? "Zusätzliches Volt jeden Monat, 2,99 € pro Volt, höchstens 30. Es kommt zu deinem Ember-Volt dazu und lässt sich jederzeit verringern." : "Extra Volt every month, 2.99 € per Volt, at most 30. It adds to your Ember Volt and can be reduced at any time."}</p>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 3, 5, 10].map((n) => <li key={n} className="lift rounded-2xl bg-white/60 p-4 text-center ring-1 ring-black/5"><span className="display flex items-center justify-center gap-1 text-3xl text-(--violet)"><Icon name="bolt" className="size-6" />+{n}</span><span className="text-sm text-(--text-dark)">{(n * 2.99).toFixed(2).replace(".", ",")} € / {de ? "Monat" : "month"}</span></li>)}
            </ul>
          </div>
        </InView>
        <p className="mt-5 text-(--text-washed)">{de ? "Spaces auf eigenen Servern haben 5 Stufen, brauchen weniger Volt und können bis 4K mit 144 Bildern streamen, wenn der Server es schafft. Emojis und Uploads setzt dort die eigene Hardware." : "Spaces on your own servers have 5 levels, need less Volt and can stream up to 4K at 144 frames if the server can handle it. Emojis and uploads are set by your own hardware there."}</p>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Berechne den Bedarf deines Spaces" : "Calculate your space requirements"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "Bewege den Regler, um zu sehen, welche Stufe du mit wie vielen Volt erreichst." : "Move the slider to see which level you reach with how many Volts."}</p>
          <VoltCalc />
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "So lädst du deinen Space auf" : "How to power your space"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "In drei einfachen Schritten zu mehr Energie für alle Mitglieder." : "In three easy steps to more energy for all members."}</p>
          <div className="mt-8">
            <Steps items={[
              { icon: "bolt", title: { de: "1. Volt erhalten", en: "1. Get Volt" }, text: { de: "Als Ember-Mitglied jeden Monat automatisch, durch Zukauf oder eingetauschtes Glimmer.", en: "Automatically as an Ember member, by buying extra or redeeming Glimmer." } },
              { icon: "spaces", title: { de: "2. Space zuweisen", en: "2. Assign to space" }, text: { de: "Lege fest, welcher deiner Spaces von deiner Energie profitieren soll.", en: "Choose which of your spaces should benefit from your energy." } },
              { icon: "sparkles", title: { de: "3. Alle genießen es", en: "3. Everyone enjoys it" }, text: { de: "Die Vorteile wie Emojis, Streaming und Uploads sind sofort für jeden freigeschaltet.", en: "Perks like emojis, streaming and uploads are unlocked for everyone immediately." } },
            ]} />
          </div>
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Häufige Fragen zu Volt" : "Frequently asked questions"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "Antworten zu Stufen, Kosten und Space-Energie." : "Answers about levels, costs and space energy."}</p>
          <PlanFaq page="volt" />
        </InView>

    </div>
  );
}

/** Glimmer: the currency that is played, not bought. */
export function GlimmerPage() {
  const { lang } = useT();
  const de = lang === "de";
  const [pass, setPass] = useState("Fox");
  const [span, setSpan] = useState(1);
  const [glimmer, setGlimmer] = useState(58);
  const cost = costs[pass][span];

  return (
    <div className="plan-page">
        <Heading title="Glimmer" color="#e0a30c" text={de ? "Eine Währung, die man erspielt, nicht kauft. Du bekommst sie fürs Benutzen von Phreox und für Freunde, und tauschst sie gegen Tage Ember und Volt." : "A currency you play for, not buy. You get it for using Phreox and for friends, and trade it for days of Ember and Volt."} />

        <InView className="mt-10">
          <div className="grid gap-6 rounded-[2rem] border border-black/10 bg-(--paper) p-7 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h3 className="display text-3xl">{de ? "Tagesaufgaben" : "Daily tasks"}</h3>
              <p className="text-(--text-washed)">{de ? "Jeden Tag neu. Erledige sie und hole dir die Belohnung ab." : "New every day. Complete them and claim the reward."}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {tasks.map((task) => {
                  const ready = task.done >= task.of;

                  return (
                    <li key={task.text.en} className="rounded-2xl bg-white/60 p-4 ring-1 ring-black/5">
                      <div className="flex items-center gap-3">
                        <Icon name={task.icon} className="size-6 shrink-0 text-(--violet)" />
                        <span className="flex-1 font-semibold">{task.text[lang]}</span>
                        <button type="button" disabled={!ready} onClick={() => setGlimmer(glimmer + task.reward)} className={`rounded-full px-3 py-1 text-sm font-bold transition active:scale-90 ${ready ? "cursor-pointer bg-[#ffd84a] text-[#23272f]" : "bg-black/5 text-(--text-dark)"}`}>+{task.reward} ✦</button>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#ffd84a] transition-all duration-700" style={{ width: `${(task.done / task.of) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-sm text-(--text-washed)">🔥 {de ? "Alle 7 Tage in Folge gibt es +15 extra." : "Every 7 days in a row gives +15 extra."}</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, #3a2a05, #14151c)" }}>
                <p className="text-xs font-bold tracking-widest text-[#ffd84a]">{de ? "DEIN GUTHABEN" : "YOUR BALANCE"}</p>
                <p className="display text-6xl text-white">{glimmer} <span className="text-[#ffd84a]">✦</span></p>
              </div>
              <div className="rounded-2xl bg-white/60 p-5 ring-1 ring-black/5">
                <h4 className="display text-2xl">{de ? "Freunde einladen" : "Invite friends"}</h4>
                <p className="mt-1 text-(--text-washed)">{de ? "Für jeden Freund, der über deinen Link beitritt, gibt es 30, und noch einmal 30, wenn er ein paar Tage dabei ist." : "For every friend who joins through your link you get 30, and another 30 once they have been around for a few days."}</p>
              </div>
              <p className="text-(--text-washed)">🎁 {de ? "Willkommensgeschenk: +40 ✦" : "Welcome gift: +40 ✦"}</p>
            </div>
          </div>
        </InView>

        <InView className="mt-6">
          <div className="rounded-[2rem] border border-black/10 bg-(--paper) p-7">
            <h3 className="display text-3xl">{de ? "Einlösen" : "Redeem"}</h3>
            <p className="text-(--text-washed)">{de ? "Tausche Glimmer gegen Tage. Ein Pass zählt, solange er besser ist als das, was du schon hast." : "Trade Glimmer for days. A pass counts as long as it is better than what you already have."}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.keys(costs).map((name) => <button key={name} type="button" onClick={() => setPass(name)} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${pass === name ? "bg-(--violet) text-white" : "bg-black/5 text-(--text-washed) hover:text-(--ink)"}`}>{name}</button>)}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {days.map((d, i) => <button key={d} type="button" onClick={() => setSpan(i)} className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition active:scale-95 ${span === i ? "bg-[#ffd84a] text-[#23272f]" : "bg-black/5 text-(--text-washed) hover:text-(--ink)"}`}>{d} {de ? "Tage" : "days"}</button>)}
            </div>
            <p className="display mt-5 text-4xl">{pass} · {days[span]} {de ? "Tage" : "days"} = <span className="text-[#e0a30c]">{cost} ✦</span></p>
            <div className="mt-3 h-2.5 max-w-md overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#ffd84a] transition-all duration-500" style={{ width: `${Math.min(100, (glimmer / cost) * 100)}%` }} /></div>
            <p className="mt-2 text-sm text-(--text-washed)">{glimmer >= cost ? (de ? "Das reicht schon." : "You can afford that.") : (de ? `Dir fehlen noch ${cost - glimmer} ✦.` : `You are ${cost - glimmer} ✦ short.`)}</p>
          </div>
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Tägliche Serien belohnen" : "Reward daily streaks"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "Klicke auf die Tage, um die kumulierten Glimmer-Boni einer Woche zu testen." : "Click on the days to test the accumulated Glimmer bonuses of a week."}</p>
          <Streak />
        </InView>

        <InView className="mt-16">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.5rem)]">{de ? "Häufige Fragen zu Glimmer" : "Frequently asked questions"}</h2>
          <p className="mt-2 mb-8 text-lg text-(--text-washed)">{de ? "So funktioniert das Erspielen und Einlösen deiner Punkte." : "How earning and redeeming your points works."}</p>
          <PlanFaq page="glimmer" />
        </InView>

    </div>
  );
}

/** A teaser for the home page. */
export function PlansTeaser() {
  const { lang } = useT();
  const de = lang === "de";

  return (
    <InView as="section" className="mx-auto mt-28 max-w-[84rem] px-5">
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 sm:p-14" style={{ background: "linear-gradient(120deg, #ff7a45 0%, #eb459f 45%, #5865f2 100%)" }}>
        <Ripples className="pointer-events-none absolute -right-32 -bottom-40 w-[34rem] opacity-40" color="#fff" />
        <div className="relative grid items-center gap-8 text-white lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="display text-[clamp(2.4rem,6vw,5rem)]">Ember <span className="opacity-70">·</span> Volt <span className="opacity-70">·</span> Glimmer</h2>
            <p className="mt-4 max-w-xl text-lg text-white/95">{de ? "Ember bringt Feuer in dein Profil, Volt lädt deinen Space auf, und Glimmer erspielst du einfach durchs Benutzen, um Tage Ember und Volt einzulösen." : "Ember puts fire into your profile, Volt charges up your space, and you earn Glimmer just by using Phreox, to redeem days of Ember and Volt."}</p>
            <Link to="/ember" className="btn btn-light mt-8 text-lg">{de ? "Mehr erfahren" : "Learn more"}<Icon name="arrow" className="size-5" /></Link>
          </div>
          <div className="flex gap-4 lg:justify-end">
            <span className="float flex size-28 items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur sm:size-36"><Icon name="fire" className="size-16 sm:size-20" /></span>
            <span className="float flex size-28 items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur sm:size-36" style={{ animationDelay: "-3s" }}><Icon name="bolt" className="size-16 sm:size-20" /></span>
            <span className="float flex size-28 items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur sm:size-36" style={{ animationDelay: "-5s" }}><Icon name="coin" className="size-16 sm:size-20" /></span>
          </div>
        </div>
      </div>
    </InView>
  );
}
