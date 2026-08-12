export type LocalStorageMigration<T> = (
  value: unknown,
  storedVersion: number,
) => T;

type VersionedValue = {
  version: number;
  value: unknown;
};

function isVersionedValue(value: unknown): value is VersionedValue {
  return Boolean(
    value &&
      typeof value === "object" &&
      "version" in value &&
      typeof value.version === "number" &&
      "value" in value,
  );
}

export function readLocalJson<T>(
  key: string,
  fallback: T,
  storage: Storage = localStorage,
  migrate?: LocalStorageMigration<T>,
): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (migrate) {
      return migrate(
        isVersionedValue(parsed) ? parsed.value : parsed,
        isVersionedValue(parsed) ? parsed.version : 0,
      );
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeLocalJson<T>(
  key: string,
  value: T,
  storage: Storage = localStorage,
) {
  storage.setItem(key, JSON.stringify(value));
}

export function removeLocalValue(
  key: string,
  storage: Storage = localStorage,
) {
  storage.removeItem(key);
}

export function readVersionedLocalJson<T>(
  key: string,
  fallback: T,
  currentVersion: number,
  migrate: LocalStorageMigration<T>,
  storage: Storage = localStorage,
) {
  const value = readLocalJson(key, fallback, storage, migrate);
  const raw = storage.getItem(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      const storedVersion = isVersionedValue(parsed) ? parsed.version : 0;
      if (storedVersion !== currentVersion) {
        writeLocalJson(key, { version: currentVersion, value }, storage);
      }
    } catch {
      // Invalid values are left recoverable through the fallback on next read.
    }
  }
  return value;
}
