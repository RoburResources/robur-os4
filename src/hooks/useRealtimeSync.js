import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Realtime sync hook using Base44's built-in entity subscriptions.
 * Automatically updates local state when records change on the server.
 */
export function useRealtimeSync(entityName, initialData = []) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const items = await base44.entities[entityName].list();
      setData(items);
    } catch (err) {
      console.error(`Failed to load ${entityName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [entityName]);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      if (event.type === "create") {
        setData((prev) => {
          if (prev.some((item) => item.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      } else if (event.type === "update") {
        setData((prev) =>
          prev.map((item) => (item.id === event.data.id ? event.data : item))
        );
      } else if (event.type === "delete") {
        setData((prev) => prev.filter((item) => item.id !== event.data.id));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [entityName, loadData]);

  return { data, setData, loading, refresh: loadData };
}