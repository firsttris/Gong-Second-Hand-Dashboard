import { useEffect, useMemo, useState } from "react";
import { DashboardItem, DashboardPayload } from "./types";

function eur(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "-";
  }
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function itemSort(a: DashboardItem, b: DashboardItem): number {
  if (a.is_new !== b.is_new) {
    return a.is_new ? -1 : 1;
  }
  return (a.price_eur ?? Number.MAX_SAFE_INTEGER) - (b.price_eur ?? Number.MAX_SAFE_INTEGER);
}

export default function App() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | DashboardItem["item_type"]>("all");
  const [onlyNew, setOnlyNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataUrl = `${import.meta.env.BASE_URL}data/items.json`;
    fetch(dataUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: DashboardPayload) => setPayload(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      });
  }, []);

  const typeOptions = useMemo(() => {
    if (!payload) {
      return [] as DashboardItem["item_type"][];
    }
    return Array.from(new Set(payload.items.map((item) => item.item_type))).sort();
  }, [payload]);

  const filtered = useMemo(() => {
    if (!payload) {
      return [] as DashboardItem[];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return payload.items
      .filter((item) => {
        if (selectedType !== "all" && item.item_type !== selectedType) {
          return false;
        }
        if (onlyNew && !item.is_new) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        const text = `${item.title} ${item.variant_title} ${item.tags.join(" ")}`.toLowerCase();
        return text.includes(normalizedQuery);
      })
      .sort(itemSort);
  }, [payload, query, selectedType, onlyNew]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const discounted = filtered.filter(
      (item) =>
        item.compare_at_price_eur !== null &&
        item.price_eur !== null &&
        item.compare_at_price_eur > item.price_eur
    ).length;
    const fresh = filtered.filter((item) => item.is_new).length;
    return { total, discounted, fresh };
  }, [filtered]);

  const panelClass =
    "rounded-2xl border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const controlClass =
    "w-full rounded-xl border border-zinc-900/15 bg-white/85 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900/30 focus:ring-2 focus:ring-orange-500/30";

  function typeLabel(value: DashboardItem["item_type"]): string {
    if (value === "wing") {
      return "Wings";
    }
    if (value === "rigid_board") {
      return "Rigid Boards";
    }
    if (value === "front_wing") {
      return "Front Wings";
    }
    if (value === "stab") {
      return "Stabs";
    }
    if (value === "mast") {
      return "Masts";
    }
    if (value === "fuselage") {
      return "Fuselages";
    }
    if (value === "lowkite") {
      return "Lowkites";
    }
    return "Other";
  }

  return (
    <div className="mx-auto w-[min(1200px,94vw)] px-0 py-8 md:py-10">
      <header className="mb-4">
        <p className="font-mono text-xs tracking-[0.12em]">GONG TRACKER</p>
        <h1 className="mt-1 text-4xl leading-none font-bold sm:text-5xl md:text-6xl">
          Second Hand Dashboard
        </h1>
        <p className="mt-1 max-w-[680px] text-zinc-700">
          Focus on your target wings, detect new listings fast, and keep your buying window short.
        </p>
      </header>

      <section className={`${panelClass} grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3`}>
        <div className="flex flex-col gap-2">
          <label htmlFor="search" className="font-mono text-xs">
            Search
          </label>
          <input
            id="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="pulse race 3.5"
            className={controlClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="type" className="font-mono text-xs">
            Type
          </label>
          <select
            id="type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as "all" | DashboardItem["item_type"])}
            className={controlClass}
          >
            <option value="all">All</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-start xl:justify-center">
          <label className="flex items-center gap-2 font-mono text-xs">
            <input
              type="checkbox"
              checked={onlyNew}
              onChange={(e) => setOnlyNew(e.target.checked)}
              className="size-4 accent-sky-500"
            />
            New only
          </label>
        </div>
      </section>

      <section className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className={`${panelClass} px-4 py-3`}>
          <h2 className="text-4xl font-bold">{stats.total}</h2>
          <p className="text-zinc-700">Visible items</p>
        </article>
        <article className={`${panelClass} px-4 py-3`}>
          <h2 className="text-4xl font-bold">{stats.discounted}</h2>
          <p className="text-zinc-700">Discounted items</p>
        </article>
        <article className={`${panelClass} px-4 py-3`}>
          <h2 className="text-4xl font-bold">{stats.fresh}</h2>
          <p className="text-zinc-700">New since last fetch</p>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {error && (
          <p className={`${panelClass} border-red-700/40 px-4 py-3 text-sm text-red-900`}>
            Cannot load data: {error}
          </p>
        )}
        {!payload && !error && <p className={`${panelClass} px-4 py-3`}>Loading data...</p>}

        {payload && filtered.length === 0 && (
          <p className={`${panelClass} px-4 py-3`}>No items match current filters.</p>
        )}

        {filtered.map((item) => (
          <article
            key={item.id}
            className={`${panelClass} overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(20,20,20,0.12)] ${
              item.is_new ? "border-sky-500/50" : ""
            }`}
          >
            {item.image_url && (
              <img src={item.image_url} alt={item.title} loading="lazy" className="h-52 w-full object-cover" />
            )}

            <div className="p-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-zinc-900/8 px-2 py-1 font-mono text-[11px]">
                  {item.collection}
                </span>
                <span className="rounded-full bg-zinc-900/8 px-2 py-1 font-mono text-[11px]">
                  {typeLabel(item.item_type)}
                </span>
                {item.is_new && (
                  <span className="rounded-full bg-sky-500/15 px-2 py-1 font-mono text-[11px] text-sky-700">
                    New
                  </span>
                )}
              </div>

              <h3 className="mt-2 text-lg leading-snug font-semibold">{item.title}</h3>
              {item.variant_title && (
                <p className="mt-1 text-sm text-zinc-700">{item.variant_title}</p>
              )}

              <div className="mt-2 flex items-baseline gap-2">
                <strong>{eur(item.price_eur)}</strong>
                {item.compare_at_price_eur && (
                  <span className="text-sm text-zinc-500 line-through">{eur(item.compare_at_price_eur)}</span>
                )}
                {item.discount_percent && (
                  <span className="font-mono text-sm text-orange-600">-{item.discount_percent}%</span>
                )}
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-semibold text-blue-700 hover:text-blue-900"
              >
                Open product page
              </a>
            </div>
          </article>
        ))}
      </section>

      <footer className="mt-4 font-mono text-xs text-zinc-700">
        Last update: {payload ? new Date(payload.generated_at).toLocaleString("de-DE") : "-"}
      </footer>
    </div>
  );
}
