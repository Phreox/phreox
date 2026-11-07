import { useEffect, useState } from "react";
import { call, useLoad } from "../api.ts";
import { useT } from "../i18n.ts";
import { Card, Empty, ErrorLine, inputClass } from "./ui.tsx";

type Column = { name: string; type: string; key: boolean; hidden: boolean };
type Table = { name: string; rows: number; columns: Column[] };
type Rows = { table: string; columns: string[]; rows: (string | number | null)[][]; total: number; page: number; size: number; search: boolean };

const sizes = [25, 50, 100, 200];

/** One cell: NULL and numbers look different from text, long text is cut by the service and shows whole as a tooltip. */
function Cell({ value }: { value: string | number | null }) {
  if (value === null) return <span className="text-(--text-dark) italic">NULL</span>;
  if (typeof value === "number") return <span className="font-mono text-(--accent)">{value}</span>;

  const marked = /^<\d+ bytes>$/.test(value);

  return <span title={value} className={`block max-w-[28rem] truncate ${marked ? "font-mono text-(--text-dark)" : ""}`}>{value}</span>;
}

/** The whole database of the service, read only: the tables on the left, the rows of the chosen table on the right. */
export function Database({ tick }: { tick: number }) {
  const { t } = useT();
  const tables = useLoad(() => call<Table[]>("GET", "/admin/database"), [tick]);
  const [name, setName] = useState<string>();
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const list = tables.value?.filter((table) => table.name.toLowerCase().includes(filter.toLowerCase())) ?? [];
  const table = tables.value?.find((item) => item.name === name);
  const rows = useLoad(
    () => (name ? call<Rows>("GET", `/admin/database/${encodeURIComponent(name)}?page=${page}&size=${size}&query=${encodeURIComponent(search)}`) : Promise.resolve(undefined)),
    [name, page, size, search, tick],
  );

  // Typing waits a moment before it asks the service.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearch(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  const total = rows.value?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const hidden = table?.columns.filter((column) => column.hidden).length ?? 0;

  function open(next: string) {
    setName(next);
    setPage(0);
    setQuery("");
    setSearch("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Card className="flex max-h-[75vh] flex-col gap-3 !p-3">
        <input className={inputClass} placeholder={t("dash.db.filter")} value={filter} onChange={(event) => setFilter(event.target.value)} />
        <p className="px-1 text-xs text-(--text-dark)">{t("dash.db.tables", { count: String(tables.value?.length ?? 0) })}</p>
        <ErrorLine error={tables.error} />

        <ul className="-mx-1 flex flex-col gap-0.5 overflow-y-auto">
          {list.map((item) => (
            <li key={item.name}>
              <button type="button" aria-current={item.name === name} className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${item.name === name ? "bg-(--background-raised) font-semibold text-white" : "text-(--text-washed) hover:bg-(--background-panel) hover:text-white"}`} onClick={() => open(item.name)}>
                <span className="truncate font-mono">{item.name}</span>
                <span className="shrink-0 text-xs text-(--text-dark)">{item.rows}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <div className="min-w-0">
        {!table && <Empty>{t("dash.db.pick")}</Empty>}

        {table && (
          <Card className="flex flex-col gap-4 !p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-mono text-lg font-semibold">{table.name}</h2>
              <span className="text-sm text-(--text-dark)">{t("dash.db.rows", { count: String(table.rows) })} · {t("dash.db.columns", { count: String(table.columns.length) })}</span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[0.7rem] font-semibold text-(--text-washed)">{t("dash.db.readonly")}</span>
              <input className={`${inputClass} ml-auto max-w-64`} placeholder={t("dash.db.search")} value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {table.columns.map((column) => (
                <span key={column.name} title={column.hidden ? t("dash.db.hidden") : undefined} className={`rounded-md border px-2 py-0.5 font-mono text-[0.7rem] ${column.hidden ? "border-[#ee0333]/40 text-[#ff7a93] line-through" : "border-(--border-surface) text-(--text-washed)"}`}>
                  {column.key ? "🔑 " : ""}{column.name}<span className="text-(--text-dark)"> {column.type.toLowerCase()}</span>
                </span>
              ))}
            </div>

            {hidden > 0 && <p className="text-xs text-(--text-dark)">{t("dash.db.hiddenNote", { count: String(hidden) })}</p>}
            <ErrorLine error={rows.error} />

            <div className="overflow-auto rounded-xl border border-(--border-surface)" style={{ maxHeight: "60vh" }}>
              <table className="w-full min-w-max text-xs">
                <thead className="sticky top-0 bg-(--background-surface)">
                  <tr>
                    {rows.value?.columns.map((column) => <th key={column} className="whitespace-nowrap border-b border-(--border-surface) px-3 py-2 text-left font-mono font-semibold text-(--text-washed)">{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.value?.rows.map((row, index) => (
                    <tr key={index} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                      {row.map((value, position) => <td key={position} className="px-3 py-1.5 align-top"><Cell value={value} /></td>)}
                    </tr>
                  ))}
                </tbody>
              </table>

              {rows.value && rows.value.rows.length === 0 && <p className="p-6 text-center text-sm text-(--text-dark)">{rows.value.search ? t("dash.db.noMatch") : t("dash.db.empty")}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-(--text-washed)">
              <span>{t("dash.db.range", { from: String(total === 0 ? 0 : page * size + 1), to: String(Math.min(total, (page + 1) * size)), total: String(total) })}</span>

              <select className={`${inputClass} !w-auto`} value={size} aria-label={t("dash.db.size")} onChange={(event) => { setSize(Number(event.target.value)); setPage(0); }}>
                {sizes.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>

              <div className="ml-auto flex items-center gap-2">
                <button type="button" disabled={page === 0} className="cursor-pointer rounded-lg border border-(--border-panel) px-3 py-1 hover:border-(--brand) disabled:cursor-default disabled:opacity-40" onClick={() => setPage(page - 1)}>←</button>
                <span>{page + 1} / {pages}</span>
                <button type="button" disabled={page + 1 >= pages} className="cursor-pointer rounded-lg border border-(--border-panel) px-3 py-1 hover:border-(--brand) disabled:cursor-default disabled:opacity-40" onClick={() => setPage(page + 1)}>→</button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
