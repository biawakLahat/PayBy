import * as React from "react";
import type { PaybyNetwork } from "../config/networks";
import type { PendingPublishItem } from "../domain/models";
import {
  readLocalJson,
  writeLocalJson,
} from "../services/storage/local";

export const PENDING_PUBLISH_KEY = "payby-pending-publishes-v1";

export function usePendingPublishes() {
  const [pendingPublishes, setPendingPublishes] = React.useState<
    PendingPublishItem[]
  >(() => readLocalJson<PendingPublishItem[]>(PENDING_PUBLISH_KEY, []));

  const commit = React.useCallback((next: PendingPublishItem[]) => {
    const trimmed = next
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 80);
    writeLocalJson(PENDING_PUBLISH_KEY, trimmed);
    return trimmed;
  }, []);

  const upsertPublishes = React.useCallback(
    (items: PendingPublishItem[]) => {
      setPendingPublishes((current) => {
        const next = [...current];
        items.forEach((item) => {
          const index = next.findIndex((candidate) => candidate.id === item.id);
          if (index >= 0) {
            next[index] = { ...next[index], ...item, updatedAt: Date.now() };
          } else {
            next.unshift(item);
          }
        });
        return commit(next);
      });
    },
    [commit],
  );

  const updatePublishes = React.useCallback(
    (
      ids: string[],
      patch:
        | Partial<PendingPublishItem>
        | ((item: PendingPublishItem) => Partial<PendingPublishItem>),
    ) => {
      if (ids.length === 0) return;
      setPendingPublishes((current) =>
        commit(
          current.map((item) => {
            if (!ids.includes(item.id)) return item;
            const nextPatch =
              typeof patch === "function" ? patch(item) : patch;
            return { ...item, ...nextPatch, updatedAt: Date.now() };
          }),
        ),
      );
    },
    [commit],
  );

  const removePublishes = React.useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const removeIds = new Set(ids);
      setPendingPublishes((current) =>
        commit(current.filter((item) => !removeIds.has(item.id))),
      );
    },
    [commit],
  );

  const markIndexed = React.useCallback(
    (owner: string, network: PaybyNetwork, blobNames: string[]) => {
      if (!owner || blobNames.length === 0) return;
      const names = new Set(blobNames);
      setPendingPublishes((current) =>
        commit(
          current.map((item) =>
            item.owner.toLowerCase() === owner.toLowerCase() &&
            item.network === network &&
            names.has(item.blobName) &&
            item.status !== "failed"
              ? { ...item, status: "ready", error: "", updatedAt: Date.now() }
              : item,
          ),
        ),
      );
    },
    [commit],
  );

  return {
    pendingPublishes,
    upsertPublishes,
    updatePublishes,
    removePublishes,
    markIndexed,
  };
}
