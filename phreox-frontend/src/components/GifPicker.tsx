import { useEffect, useState } from "react";
import { type GifResult, searchGifs } from "../lib/klipy.ts";

export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(undefined);

      try {
        setResults(await searchGifs(query, controller.signal));
      } catch (caught) {
        if (controller.signal.aborted) return;

        setResults([]);
        setError(caught instanceof Error ? caught.message : "Unbekannter Fehler");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <input
        className="px-3 py-2 text-sm bg-(--background-panel) border border-(--border-panel) rounded-lg outline-none"
        placeholder="GIFs suchen (Klipy)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {error && <p className="text-xs text-(--text-washed)">{error}</p>}

      {loading && results.length === 0 && (
        <p className="text-xs text-(--text-dark)">Lade GIFs…</p>
      )}

      <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
        {results.map((gif) => (
          <button
            key={gif.id}
            type="button"
            title={gif.title}
            className="rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity duration-200 ease-in-out"
            onClick={() => onSelect(gif.url)}
          >
            <img src={gif.preview} alt={gif.title} className="w-full h-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}
