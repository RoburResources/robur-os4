import { useState, useEffect, useCallback, useRef } from "react";

const QUEUE_KEY = "robur_offline_queue";

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Offline-first data ingestion hook.
 * Queues entity operations when offline and flushes them when connectivity is restored.
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(readQueue());
  const flushing = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const enqueue = useCallback((operation) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...operation,
      queued_at: new Date().toISOString(),
    };
    const next = [...readQueue(), item];
    writeQueue(next);
    setQueue(next);
    return item;
  }, []);

  const flushQueue = useCallback(async () => {
    if (flushing.current) return;
    const pending = readQueue();
    if (pending.length === 0) return;

    flushing.current = true;
    const { base44 } = await import("@/api/base44Client");
    const remaining = [];

    for (const item of pending) {
      try {
        const entity = base44.entities[item.entityName];
        if (!entity) {
          remaining.push(item);
          continue;
        }
        if (item.operation === "create") {
          await entity.create(item.data);
        } else if (item.operation === "update") {
          await entity.update(item.id, item.data);
        } else if (item.operation === "delete") {
          await entity.delete(item.id);
        }
      } catch (err) {
        // Re-queue on failure for next attempt
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    setQueue(remaining);
    flushing.current = false;
  }, []);

  // Attempt flush on mount if online
  useEffect(() => {
    if (navigator.onLine) flushQueue();
  }, [flushQueue]);

  /**
   * Create an entity record — works offline.
   * Returns immediately with a temporary record if offline.
   */
  const create = useCallback(
    async (entityName, data) => {
      if (navigator.onLine) {
        const { base44 } = await import("@/api/base44Client");
        return base44.entities[entityName].create(data);
      }
      const temp = { ...data, id: `offline-${Date.now()}`, _offline: true };
      enqueue({ entityName, operation: "create", data });
      return temp;
    },
    [enqueue]
  );

  return { isOnline, queue, enqueue, flushQueue, create, pendingCount: queue.length };
}