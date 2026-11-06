/** Stands in for the emoji component of the app inside news posts: the emoji as text, with no custom emojis and no pictures from outside. */
export function Emoji({ emoji }: { emoji: string }) {
  return <span className="inline-block align-text-bottom" role="img" aria-label={emoji}>{emoji}</span>;
}

export function twemojiUrl(): string {
  return "";
}
