// Klipy is migrated from Tenor: the FAQ says to replace the Tenor base URL
// with api.klipy.com. The Tenor v2 paths and response shape are assumed here
// and still need checking against docs.klipy.com.
const baseUrl = "https://api.klipy.com";

export type GifResult = {
  id: string;
  title: string;
  preview: string;
  url: string;
};

type TenorLikeResponse = {
  results?: {
    id: string;
    title?: string;
    media_formats?: Record<string, { url?: string } | undefined>;
  }[];
};

export async function searchGifs(
  query: string,
  signal?: AbortSignal,
): Promise<GifResult[]> {
  const apiKey = import.meta.env.VITE_KLIPY_API_KEY;

  if (!apiKey) {
    throw new Error("VITE_KLIPY_API_KEY ist nicht gesetzt");
  }

  const params = new URLSearchParams({
    key: apiKey,
    client_key: "phreox",
    limit: "24",
    media_filter: "gif,tinygif",
  });

  const trimmed = query.trim();
  let path = "/v2/featured";

  if (trimmed) {
    params.set("q", trimmed);
    path = "/v2/search";
  }

  const response = await fetch(`${baseUrl}${path}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Klipy-Anfrage fehlgeschlagen (${response.status})`);
  }

  const data = (await response.json()) as TenorLikeResponse;

  return (data.results ?? []).flatMap((result) => {
    const url = result.media_formats?.gif?.url;
    const preview = result.media_formats?.tinygif?.url ?? url;

    if (!url || !preview) return [];

    return [{ id: result.id, title: result.title ?? "GIF", preview, url }];
  });
}
