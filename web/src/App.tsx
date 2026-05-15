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
  if (a.is_relevant !== b.is_relevant) {
    return a.is_relevant ? -1 : 1;
  }
  if (a.is_new !== b.is_new) {
    return a.is_new ? -1 : 1;
  }
  return (a.price_eur ?? Number.MAX_SAFE_INTEGER) - (b.price_eur ?? Number.MAX_SAFE_INTEGER);
}

export default function App() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [query, setQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("all");
  const [onlyRelevant, setOnlyRelevant] = useState(true);
  const [onlyNew, setOnlyNew] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(1200);
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

  const interestOptions = useMemo(() => {
    if (!payload) {
      return [] as string[];
    }
    const all = new Set<string>();
    payload.items.forEach((item) => {
      item.matched_interests.forEach((label) => all.add(label));
    });
    return Array.from(all).sort((a, b) => a.localeCompare(b));
  }, [payload]);

  const filtered = useMemo(() => {
    if (!payload) {
      return [] as DashboardItem[];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return payload.items
      .filter((item) => {
        if (onlyRelevant && !item.is_relevant) {
          return false;
        }
        if (onlyNew && !item.is_new) {
          return false;
        }
        if (selectedInterest !== "all" && !item.matched_interests.includes(selectedInterest)) {
          return false;
        }
        if (item.price_eur !== null && item.price_eur > maxPrice) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        const text = `${item.title} ${item.variant_title} ${item.tags.join(" ")}`.toLowerCase();
        return text.includes(normalizedQuery);
      })
      .sort(itemSort);
  }, [payload, query, selectedInterest, onlyRelevant, onlyNew, maxPrice]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const relevant = filtered.filter((item) => item.is_relevant).length;
    const fresh = filtered.filter((item) => item.is_new).length;
    return { total, relevant, fresh };
  }, [filtered]);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">GONG TRACKER</p>
        <h1>Second Hand Dashboard</h1>
        <p className="subline">
          Focus on your target wings, detect new listings fast, and keep your buying window short.
        </p>
      </header>

      <section className="panel controls">
        <div className="control">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="pulse race 3.5"
          />
        </div>

        <div className="control">
          <label htmlFor="interest">Interest</label>
          <select
            id="interest"
            value={selectedInterest}
            onChange={(e) => setSelectedInterest(e.target.value)}
          >
            <option value="all">All</option>
            {interestOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="control">
          <label htmlFor="max-price">Max price: {eur(maxPrice)}</label>
          <input
            id="max-price"
            type="range"
            min={100}
            max={2000}
            step={10}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
          />
        </div>

        <div className="control switch-row">
          <label>
            <input
              type="checkbox"
              checked={onlyRelevant}
              onChange={(e) => setOnlyRelevant(e.target.checked)}
            />
            Relevant only
          </label>
          <label>
            <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
            New only
          </label>
        </div>
      </section>

      <section className="stats-grid">
        <article className="panel stat">
          <h2>{stats.total}</h2>
          <p>Visible items</p>
        </article>
        <article className="panel stat">
          <h2>{stats.relevant}</h2>
          <p>Relevant matches</p>
        </article>
        <article className="panel stat">
          <h2>{stats.fresh}</h2>
          <p>New since last fetch</p>
        </article>
      </section>

      <section className="list">
        {error && <p className="panel error">Cannot load data: {error}</p>}
        {!payload && !error && <p className="panel">Loading data...</p>}

        {payload && filtered.length === 0 && <p className="panel">No items match current filters.</p>}

        {filtered.map((item) => (
          <article key={item.id} className={`panel card ${item.is_new ? "new" : ""}`}>
            {item.image_url && <img src={item.image_url} alt={item.title} loading="lazy" />}

            <div className="card-content">
              <div className="chips">
                <span className="chip">{item.collection}</span>
                {item.is_relevant && <span className="chip chip-good">Relevant</span>}
                {item.is_new && <span className="chip chip-new">New</span>}
              </div>

              <h3>{item.title}</h3>
              {item.variant_title && <p className="variant">{item.variant_title}</p>}

              <div className="price-row">
                <strong>{eur(item.price_eur)}</strong>
                {item.compare_at_price_eur && (
                  <span className="old-price">{eur(item.compare_at_price_eur)}</span>
                )}
                {item.discount_percent && <span className="discount">-{item.discount_percent}%</span>}
              </div>

              {item.matched_interests.length > 0 && (
                <p className="matches">Matches: {item.matched_interests.join(", ")}</p>
              )}

              <a href={item.url} target="_blank" rel="noreferrer">
                Open product page
              </a>
            </div>
          </article>
        ))}
      </section>

      <footer>
        Last update: {payload ? new Date(payload.generated_at).toLocaleString("de-DE") : "-"}
      </footer>
    </div>
  );
}
