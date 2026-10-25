import { news } from "../data/news.ts";

export function News() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b-2 border-b-(--background-panel)">
        <p className="font-semibold">News</p>
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col gap-3 overflow-y-auto">
        {news.map((item) => (
          <article
            key={item.id}
            className="p-4 flex flex-col gap-2 bg-(--background-dark) border border-(--border-surface) rounded-xl"
          >
            <div className="flex justify-between items-center gap-2 text-xs text-(--text-dark)">
              <span className="px-2 py-1 bg-(--background-panel) border border-(--border-panel) rounded-xl text-(--text-washed)">
                {item.category}
              </span>

              <time dateTime={item.timestamp}>
                {new Date(item.timestamp).toLocaleString("de-DE")}
              </time>
            </div>

            <h2 className="font-semibold">{item.title}</h2>

            <p className="text-sm text-(--text-washed)">{item.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
