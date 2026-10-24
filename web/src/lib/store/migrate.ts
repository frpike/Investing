import type { SupabaseStore } from "./supabase-store";
import { emptyData, type AppData } from "./types";

/** Copies progress kept in this browser (or this computer) into an empty Supabase account. */
export async function migrateGuest(account: SupabaseStore, guest: AppData): Promise<AppData> {
  const empty = emptyData();
  await account.save(guest, { type: "prefs" }, empty);
  if (guest.diagnostic) await account.save(guest, { type: "diagnostic" }, empty);
  for (const a of guest.attempts) {
    const conceptIds = Object.keys(guest.concepts);
    await account.save(guest, { type: "quiz", attempt: a, conceptIds, lessonId: a.lessonId }, { ...guest, activityDays: [] });
  }
  for (const id of Object.keys(guest.lessonProgress)) await account.save(guest, { type: "lessonStarted", lessonId: id }, empty);
  if (guest.portfolio) await account.save(guest, { type: "portfolio" }, empty);
  // Sync history: the portfolio is already saved, so each call only adds the snapshot row.
  for (const snapshot of guest.snapshots) await account.save(guest, { type: "brokerSync", snapshot }, guest);
  await account.save(guest, { type: "tutorTopics" }, { ...guest, activityDays: [] });
  return account.load();
}
