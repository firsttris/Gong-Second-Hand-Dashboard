import { useMemo } from "react";
import { DashboardItem, DashboardPayload } from "../types";

function itemSort(a: DashboardItem, b: DashboardItem): number {
  if (a.is_new !== b.is_new) {
    return a.is_new ? -1 : 1;
  }
  return (a.price_eur ?? Number.MAX_SAFE_INTEGER) - (b.price_eur ?? Number.MAX_SAFE_INTEGER);
}

export function useDashboardItems(
  payload: DashboardPayload | null,
  query: string,
  selectedType: "all" | DashboardItem["item_type"],
  onlyNew: boolean
) {
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

  return { typeOptions, filtered, stats };
}
