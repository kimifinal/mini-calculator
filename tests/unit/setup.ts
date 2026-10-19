/**
 * Test setup: ensure a `localStorage` is available even on Node runtimes that
 * do not provide one out of the box (this host's Node flags native
 * `localStorage` behind `--localstorage-file`, so jsdom does not expose it).
 * The component itself guards all storage access, so a missing localStorage is
 * a no-op in production; this polyfill lets the *persistence* tests run.
 */
class MemoryStorage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key) as string : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

function install(): void {
  const g = globalThis as unknown as { localStorage?: Storage; window?: Window & typeof globalThis };
  if (g.localStorage) return;
  const s = new MemoryStorage();
  g.localStorage = s as unknown as Storage;
  if (g.window) {
    try {
      Object.defineProperty(g.window, 'localStorage', {
        value: s,
        writable: true,
        configurable: true,
      });
    } catch {
      g.window.localStorage = s as unknown as Storage;
    }
  }
}

install();
