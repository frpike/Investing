import { GuestStore } from "./guest-store";
import { emptyData, type AppData, type Store } from "./types";

// Personal mode: progress is saved to a file on the computer running the app (via
// /api/personal/data, protected by the access code) and mirrored in this browser.
export class PersonalStore implements Store {
  readonly kind = "guest" as const; // not a cloud account; the UI shows it as "saved on this computer"
  private local = new GuestStore();
  constructor(private code: string) {}

  /** Returns the saved copy, or null when the file is empty; throws on a wrong code or server error. */
  async fetchRemote(): Promise<AppData | null> {
    const res = await fetch("/api/personal/data", { headers: { "x-access-code": this.code }, cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Couldn't load saved progress.");
    return body.data ? { ...emptyData(), ...body.data } : null;
  }

  async load(): Promise<AppData> {
    return (await this.fetchRemote()) ?? (await this.local.load());
  }

  async save(next: AppData): Promise<void> {
    await this.local.save(next);
    const res = await fetch("/api/personal/data", { method: "PUT", headers: { "content-type": "application/json", "x-access-code": this.code }, body: JSON.stringify(next) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't save progress to this computer.");
  }

  async exportAll() {
    return { exportedAt: new Date().toISOString(), mode: "personal", data: await this.load() };
  }

  async deleteAll() {
    await this.local.deleteAll();
    await fetch("/api/personal/data", { method: "PUT", headers: { "content-type": "application/json", "x-access-code": this.code }, body: JSON.stringify(emptyData()) });
  }
}
