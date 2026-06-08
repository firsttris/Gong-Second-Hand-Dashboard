import { type FormEvent, useMemo, useState } from "react";
import { DashboardItem } from "./types";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDashboardItems } from "./hooks/useDashboardItems";

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

function withoutFrenchVat(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  return Number((value / 1.2).toFixed(2));
}

const AUTH_SESSION_KEY = "gong_dashboard_auth";

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => window.sessionStorage.getItem(AUTH_SESSION_KEY) === "1");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [sharedItemId, setSharedItemId] = useState<string | null>(null);

  const configuredPassword = useMemo(() => {
    const value = import.meta.env.VITE_DASHBOARD_PASSWORD;
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    return "gong123";
  }, []);

  const { payload, error } = useDashboardData();
  const { query, setQuery, selectedType, setSelectedType, onlyNew, setOnlyNew } = useDashboardFilters();
  const { typeOptions, filtered, stats } = useDashboardItems(payload, query, selectedType, onlyNew);

  const panelClass =
    "rounded-2xl border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const controlClass =
    "w-full rounded-xl border border-zinc-900/15 bg-white/85 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900/30 focus:ring-2 focus:ring-orange-500/30";

  function onUnlockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordInput === configuredPassword) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      setIsUnlocked(true);
      setPasswordInput("");
      setAuthError("");
      return;
    }
    setAuthError("Wrong password.");
  }

  function lockDashboard() {
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setIsUnlocked(false);
  }

  async function shareItem(item: DashboardItem) {
    const shareData = {
      title: item.title,
      text: `${item.title} (${item.collection})`,
      url: item.url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(item.url);
      } else {
        throw new Error("Share not supported");
      }

      setSharedItemId(item.id);
      window.setTimeout(() => {
        setSharedItemId((current) => (current === item.id ? null : current));
      }, 1600);
    } catch (err) {
      // Ignore canceled native share dialogs, only surface real failures.
      if (!(err instanceof Error && err.name === "AbortError")) {
        window.alert("Sharing failed on this device.");
      }
    }
  }

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
    if (value === "surf_foil_board") {
      return "Surf Foil Boards";
    }
    if (value === "sup_foil_board") {
      return "SUP Foil Boards";
    }
    if (value === "inflatable_wing_board") {
      return "Inflatable Wing Boards";
    }
    if (value === "wing_accessory") {
      return "Wing Accessories";
    }
    return "Other";
  }

  if (!isUnlocked) {
    return (
      <div className="mx-auto grid min-h-screen w-[min(520px,92vw)] place-items-center py-10">
        <section className={`${panelClass} w-full p-6 sm:p-8`}>
          <p className="font-mono text-xs tracking-[0.12em]">GONG TRACKER</p>
          <h1 className="mt-2 text-3xl leading-none font-bold sm:text-4xl">Protected Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Enter the password to access the second-hand dashboard.
          </p>

          <form className="mt-5 space-y-3" onSubmit={onUnlockSubmit}>
            <label htmlFor="dashboard-password" className="block font-mono text-xs">
              Password
            </label>
            <input
              id="dashboard-password"
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={controlClass}
              autoComplete="current-password"
              placeholder="Enter password"
            />
            {authError && <p className="text-sm text-red-700">{authError}</p>}
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Unlock
            </button>
          </form>

          <p className="mt-4 text-xs text-zinc-500">
            This is a simple frontend gate. Set `VITE_DASHBOARD_PASSWORD` to change the password.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-[min(1200px,94vw)] px-0 py-8 md:py-10">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.12em]">GONG TRACKER</p>
          <button
            type="button"
            onClick={lockDashboard}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Lock
          </button>
        </div>
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

        {filtered.map((item) => {
          const netPrice = withoutFrenchVat(item.price_eur);
          const hasStructuredVariants =
            !!item.variant_base ||
            (Array.isArray(item.variant_sizes) && item.variant_sizes.length > 0) ||
            (Array.isArray(item.variant_colors) && item.variant_colors.length > 0);

          return (
            <article
              key={item.id}
              className={`${panelClass} flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(20,20,20,0.12)] ${
                item.is_new ? "border-sky-500/50" : ""
              }`}
            >
              {item.image_url && (
                <img src={item.image_url} alt={item.title} loading="lazy" className="h-52 w-full object-cover" />
              )}

              <div className="flex flex-1 flex-col p-3">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-zinc-900/8 px-2 py-1 font-mono text-[11px]">
                    {item.collection}
                  </span>
                  {!!item.variant_count && item.variant_count > 1 && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-mono text-[11px] text-emerald-700">
                      {item.variant_count} variants
                    </span>
                  )}
                  {item.is_new && (
                    <span className="rounded-full bg-sky-500/15 px-2 py-1 font-mono text-[11px] text-sky-700">
                      New
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-lg leading-snug font-semibold">{item.title}</h3>
                {hasStructuredVariants ? (
                  <div className="mt-2 space-y-2">
                    {item.variant_base && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-zinc-500">Material</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-800">
                          {item.variant_base}
                        </span>
                      </div>
                    )}

                    {!!item.variant_sizes?.length && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-zinc-500">Groessen</span>
                        {item.variant_sizes.map((size) => (
                          <span
                            key={`${item.id}-size-${size}`}
                            className="rounded-full bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-800"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    )}

                    {!!item.variant_colors?.length && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] text-zinc-500">Farben</span>
                        {item.variant_colors.map((color) => (
                          <span
                            key={`${item.id}-color-${color}`}
                            className="rounded-full bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-800"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  item.variant_title && <p className="mt-1 text-sm text-zinc-700">{item.variant_title}</p>
                )}
                {!!item.variant_count && item.variant_count > 1 && (
                  <p className="mt-1 text-xs font-mono text-zinc-500">Grouped product listing</p>
                )}

                <div className="mt-3">
                  <p className="text-2xl leading-none font-bold text-zinc-900">{eur(netPrice)} ex MwSt</p>

                  <div className="mt-2 space-y-1 text-xs text-zinc-600">
                    <p>
                      Rabattpreis: <span className="font-semibold text-zinc-800">{eur(item.price_eur)}</span>
                    </p>
                    {item.compare_at_price_eur && (
                      <p>
                        Listenpreis: <span className="text-zinc-500 line-through">{eur(item.compare_at_price_eur)}</span>
                      </p>
                    )}
                    {item.discount_percent && <p className="font-mono text-orange-600">Rabatt: -{item.discount_percent}%</p>}
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block font-semibold text-blue-700 hover:text-blue-900"
                    >
                      Open product page
                    </a>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => shareItem(item)}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Share
                    </button>
                    {sharedItemId === item.id && <span className="text-xs text-emerald-700">Shared</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <footer className="mt-4 font-mono text-xs text-zinc-700">
        Last update: {payload ? new Date(payload.generated_at).toLocaleString("de-DE") : "-"}
      </footer>
    </div>
  );
}
