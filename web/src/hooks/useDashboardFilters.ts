import { useEffect, useState } from "react";
import { DashboardItem } from "../types";

const SEARCH_PARAM = "q";
const TYPE_PARAM = "type";

function isDashboardItemType(value: string): value is DashboardItem["item_type"] {
  return [
    "wing",
    "rigid_board",
    "front_wing",
    "stab",
    "mast",
    "fuselage",
    "lowkite",
    "surf_foil_board",
    "inflatable_wing_board",
    "wing_accessory",
    "other",
  ].includes(value);
}

function readFiltersFromUrl(): { query: string; selectedType: "all" | DashboardItem["item_type"] } {
  const params = new URLSearchParams(window.location.search);
  const query = params.get(SEARCH_PARAM) ?? "";
  const typeParam = params.get(TYPE_PARAM) ?? "all";
  const selectedType: "all" | DashboardItem["item_type"] =
    typeParam === "all" || isDashboardItemType(typeParam) ? typeParam : "all";

  return { query, selectedType };
}

export function useDashboardFilters() {
  const initialFilters = readFiltersFromUrl();
  const [query, setQuery] = useState(initialFilters.query);
  const [selectedType, setSelectedType] = useState<"all" | DashboardItem["item_type"]>(
    initialFilters.selectedType
  );
  const [onlyNew, setOnlyNew] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const filters = readFiltersFromUrl();
      setQuery(filters.query);
      setSelectedType(filters.selectedType);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (query.trim()) {
      params.set(SEARCH_PARAM, query);
    } else {
      params.delete(SEARCH_PARAM);
    }

    if (selectedType !== "all") {
      params.set(TYPE_PARAM, selectedType);
    } else {
      params.delete(TYPE_PARAM);
    }

    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", next);
  }, [query, selectedType]);

  return {
    query,
    setQuery,
    selectedType,
    setSelectedType,
    onlyNew,
    setOnlyNew,
  };
}
