import { emptyData, type AppData, type Store } from "./types";

// Guest mode: everything stays in this browser's localStorage until the learner signs up.
export const GUEST_KEY = "groundwork:guest:v1";

export class GuestStore implements Store {
  readonly kind = "guest" as const;

  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      if (!raw) return emptyData();
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return parsed?.version === 1 ? { ...emptyData(), ...parsed } : emptyData();
    } catch {
      return emptyData();
    }
  }

  async save(next: AppData): Promise<void> {
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked (private browsing). The session still works; nothing persists.
    }
  }

  async exportAll() {
    return { exportedAt: new Date().toISOString(), mode: "guest", data: await this.load() };
  }

  async deleteAll() {
    try { localStorage.removeItem(GUEST_KEY); } catch { /* nothing stored */ }
  }

  static hasData(): boolean {
    try { return !!localStorage.getItem(GUEST_KEY); } catch { return false; }
  }
}
