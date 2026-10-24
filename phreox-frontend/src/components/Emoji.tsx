import { useState } from "react";

// Twemoji SVGs from the jdecked/twemoji fork, served via jsDelivr.
// The version is pinned: a tagged URL is served with
// "Cache-Control: immutable" for a year, so browsers keep each emoji after
// the first load. "@latest" would be re-validated and cached far less well.
const twemojiBase =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@v17.0.3/assets/svg";

export function twemojiUrl(emoji: string) {
  // Twemoji drops U+FE0F, except inside ZWJ sequences such as 🚵‍♂️.
  const hasJoiner = emoji.includes("‍");
  const codepoints = Array.from(emoji)
    .map((char) => char.codePointAt(0)?.toString(16) ?? "")
    .filter((codepoint) => hasJoiner || codepoint !== "fe0f");

  return `${twemojiBase}/${codepoints.join("-")}.svg`;
}

export function Emoji({ emoji }: { emoji: string }) {
  const [failed, setFailed] = useState(false);

  // Recent Unicode emoji are missing from the Twemoji set. Show the
  // system glyph instead of a broken image.
  if (failed) return <span>{emoji}</span>;

  return (
    <img
      src={twemojiUrl(emoji)}
      alt={emoji}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className="inline-block w-[1.2em] h-[1.2em] align-[-0.2em]"
    />
  );
}
