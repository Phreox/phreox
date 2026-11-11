import type { ReactNode } from "react";

/** A small stand-in for the Markdown component of the app, used only when ../phreox-frontend is not checked out. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i} className="rounded bg-black/5 px-1">{part.slice(1, -1)}</code>;
    if (part.startsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link && /^(https?:|\/)/.test(link[2])) return <a key={i} href={link[2]} className="text-(--violet) underline">{link[1]}</a>;
    return part;
  });
}

export function Markdown({ source }: { source: string }) {
  return (
    <>
      {source.split(/\n{2,}/).map((block, i) => {
        const heading = /^(#{1,3})\s+(.*)$/.exec(block);
        if (heading) return <h2 key={i} className="display mt-6 text-3xl">{inline(heading[2])}</h2>;
        return <p key={i} className="mt-4 whitespace-pre-line">{inline(block)}</p>;
      })}
    </>
  );
}
