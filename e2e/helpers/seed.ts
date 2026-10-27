import type { Page } from '@playwright/test';
import type { HistoryEntry, PlayRecord, Playlist, Track, UserPreferences } from '../../db/schema';

/** Name of the Dexie database, from db/schema.ts. */
const DB_NAME = 'MinimalistYTPlayerDB';

export interface SeedData {
  tracks?: Track[];
  playlists?: Playlist[];
  history?: HistoryEntry[];
  plays?: PlayRecord[];
  /** Same shape as the `preferences` table, e.g. { key: 'sessionRestoreEnabled', value: false }. */
  preferences?: UserPreferences[];
}

type StoreName = 'tracks' | 'playlists' | 'history' | 'plays' | 'preferences';
const STORES: StoreName[] = ['tracks', 'playlists', 'history', 'plays', 'preferences'];

/**
 * Writes rows into the app's own IndexedDB database. The page must already be on the app origin
 * and have opened the database once (Dexie creates the schema on first use), so this uses the
 * real schema from db/schema.ts instead of re-declaring it. Reload the page afterwards: Dexie
 * live queries only see writes made through their own connection.
 */
export async function writeSeed(page: Page, data: SeedData): Promise<void> {
  await page.evaluate(
    async ({ dbName, data, stores }) => {
      const deadline = Date.now() + 10_000;
      // Wait for the app to create the database so opening it without a version never creates an empty one.
      for (;;) {
        const dbs = await indexedDB.databases();
        if (dbs.some((d) => d.name === dbName)) break;
        if (Date.now() > deadline) throw new Error(`IndexedDB "${dbName}" was never created by the app`);
        await new Promise((r) => setTimeout(r, 50));
      }
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        for (const name of stores) {
          if (!db.objectStoreNames.contains(name)) throw new Error(`Store "${name}" missing; db/schema.ts changed?`);
        }
        const used = stores.filter((s) => (data as Record<string, unknown[] | undefined>)[s]?.length);
        if (used.length === 0) return;
        const tx = db.transaction(used, 'readwrite');
        for (const name of used) {
          const store = tx.objectStore(name);
          for (const row of (data as Record<string, unknown[]>)[name]) store.put(row);
        }
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: DB_NAME, data, stores: STORES }
  );
}

/** Reads every row of one store; handy for asserting persistence. */
export async function readStore<T = unknown>(page: Page, store: StoreName): Promise<T[]> {
  return page.evaluate(
    async ({ dbName, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(dbName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      try {
        return await new Promise<unknown[]>((resolve, reject) => {
          const req = db.transaction(store).objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      } finally {
        db.close();
      }
    },
    { dbName: DB_NAME, store }
  ) as Promise<T[]>;
}
