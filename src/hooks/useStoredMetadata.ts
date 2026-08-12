import * as React from "react";
import type { MediaMetadata, MetadataSyncState } from "../domain/models";
import {
  readLocalJson,
  writeLocalJson,
} from "../services/storage/local";

export const METADATA_KEY = "payby-media-metadata-v1";

export function useStoredMetadata() {
  const [metadata, setMetadata] = React.useState<Record<string, MediaMetadata>>(
    () => readLocalJson<Record<string, MediaMetadata>>(METADATA_KEY, {}),
  );
  const [syncState] = React.useState<MetadataSyncState>("local");

  const saveMetadata = React.useCallback(
    (items: MediaMetadata[]) => {
      setMetadata((current) => {
        const next = { ...current };
        items.forEach((item) => {
          next[item.key] = item;
        });
        writeLocalJson(METADATA_KEY, next);
        return next;
      });
    },
    [],
  );

  const removeMetadata = React.useCallback((key: string) => {
    setMetadata((current) => {
      const next = { ...current };
      delete next[key];
      writeLocalJson(METADATA_KEY, next);
      return next;
    });
  }, []);

  return { metadata, saveMetadata, removeMetadata, syncState };
}
