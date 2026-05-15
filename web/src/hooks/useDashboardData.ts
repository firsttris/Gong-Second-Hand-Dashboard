import { useEffect, useState } from "react";
import { DashboardPayload } from "../types";

export function useDashboardData() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
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

  return { payload, error };
}
