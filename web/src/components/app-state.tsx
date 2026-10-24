"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CODE_KEY, personalStatus, savedCode, syncTrading212, type PersonalStatus } from "@/lib/broker/client-sync";
import { GuestStore } from "@/lib/store/guest-store";
import { PersonalStore } from "@/lib/store/personal-store";
import { SupabaseStore } from "@/lib/store/supabase-store";
import { emptyData, type AppData, type Change, type Store } from "@/lib/store/types";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Transition = (data: AppData) => [AppData, Change] | null;

interface AppState {
  ready: boolean;
  data: AppData;
  mode: "guest" | "account";
  user: User | null;
  /** Apply a pure transition (from lib/store/actions), update the screen at once, then save. */
  apply: (t: Transition) => Promise<AppData>;
  exportAll: () => Promise<unknown>;
  deleteAll: () => Promise<void>;
  signOut: () => Promise<void>;
  accountsEnabled: boolean;
  /** Where progress is kept: this browser, a file on this computer (personal mode), or a cloud account. */
  storage: "browser" | "computer" | "account";
  personal: PersonalStatus | null;
  /** Personal mode: check the access code, then keep progress in the file on this computer. */
  connectPersonal: (code: string) => Promise<{ ok: boolean; error?: string }>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [storage, setStorage] = useState<AppState["storage"]>("browser");
  const [personal, setPersonal] = useState<PersonalStatus | null>(null);
  const autoSynced = useRef(false);
  const storeRef = useRef<Store>(new GuestStore());
  const dataRef = useRef<AppData>(data);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const supabase = getBrowserSupabase();

  const commit = (next: AppData) => { dataRef.current = next; setData(next); };

  const loadFor = useCallback(async (u: User | null) => {
    setReady(false);
    let store: Store = new GuestStore();
    if (u && supabase) {
      const account = new SupabaseStore(supabase, u.id);
      try {
        let loaded = await account.load();
        // First sign-in after trying guest mode: move guest progress into the empty account.
        if (!loaded.onboardedAt && GuestStore.hasData()) {
          const guest = await new GuestStore().load();
          if (guest.onboardedAt) {
            loaded = await migrateGuest(account, guest);
            await new GuestStore().deleteAll();
            toast.success("Your progress from this browser was saved to your account.");
          }
        }
        store = account;
        commit(loaded);
      } catch (e) {
        toast.error(`Couldn't load your account (${(e as Error).message}). Using this browser for now.`);
        commit(await store.load());
      }
    } else {
      commit(await store.load());
    }
    storeRef.current = store;
    setMode(store.kind);
    setStorage(store.kind === "account" ? "account" : "browser");
    setReady(true);
    // Personal mode: if this browser remembers the access code, switch to the file on this computer.
    if (store.kind !== "account") {
      const status = await personalStatus();
      setPersonal(status);
      const code = savedCode();
      if (status.fileStorage && code) await switchToPersonalStore(code, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  /** Loads the computer's saved copy (or uploads this browser's progress if there isn't one yet). */
  async function switchToPersonalStore(code: string, quiet: boolean): Promise<{ ok: boolean; error?: string }> {
    const store = new PersonalStore(code);
    try {
      const remote = await store.fetchRemote();
      const current = dataRef.current;
      const hasProgress = (d: AppData) => !!(d.onboardedAt || d.attempts.length || d.portfolio?.holdings.length);
      if (remote && hasProgress(remote)) commit(remote);
      else if (hasProgress(current)) await store.save(current);
      storeRef.current = store;
      setStorage("computer");
      return { ok: true };
    } catch (e) {
      if (!quiet) return { ok: false, error: (e as Error).message };
      return { ok: false };
    }
  }

  useEffect(() => {
    if (!supabase) { void Promise.resolve().then(() => loadFor(null)); return; }
    let current: string | null | undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      if (u?.id === current) return;
      current = u?.id ?? null;
      setUser(u);
      void loadFor(u);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, loadFor]);

  const apply = useCallback(async (t: Transition) => {
    const prev = dataRef.current;
    const res = t(prev);
    if (!res) return prev;
    const [next, change] = res;
    commit(next);
    const store = storeRef.current;
    queue.current = queue.current.then(() => store.save(next, change, prev)).catch((e) => {
      toast.error(`Couldn't save that change: ${(e as Error).message}`);
    });
    await queue.current;
    return next;
  }, []);

  // Personal mode: refresh from Trading 212 when the app opens, if the last sync is over 15 minutes old.
  useEffect(() => {
    if (!ready || autoSynced.current || !personal?.enabled) return;
    const code = savedCode();
    const last = data.snapshots.at(-1);
    if (!code || (last && Date.now() - Date.parse(last.takenAt) < 15 * 60_000)) return;
    autoSynced.current = true;
    void syncTrading212(code, apply).then((r) => {
      if (r.ok) toast.success(`Updated from Trading 212: ${r.count} holding${r.count === 1 ? "" : "s"}.`);
      else if (r.status === 401) { try { localStorage.removeItem(CODE_KEY); } catch { /* ignore */ } }
    });
  }, [ready, personal, data.snapshots, apply]);

  const value = useMemo<AppState>(() => ({
    ready, data, user,
    mode,
    apply,
    exportAll: () => storeRef.current.exportAll(),
    deleteAll: async () => {
      await storeRef.current.deleteAll();
      if (storeRef.current.kind === "account") await supabase?.auth.signOut();
      commit(emptyData());
    },
    signOut: async () => { await supabase?.auth.signOut(); },
    accountsEnabled: !!supabase,
    storage,
    personal,
    connectPersonal: (code: string) => switchToPersonalStore(code, false),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ready, data, user, mode, apply, supabase, storage, personal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

async function migrateGuest(account: SupabaseStore, guest: AppData): Promise<AppData> {
  const empty = emptyData();
  await account.save(guest, { type: "prefs" }, empty);
  if (guest.diagnostic) await account.save(guest, { type: "diagnostic" }, empty);
  for (const a of guest.attempts) {
    const conceptIds = Object.keys(guest.concepts);
    await account.save(guest, { type: "quiz", attempt: a, conceptIds, lessonId: a.lessonId }, { ...guest, activityDays: [] });
  }
  for (const id of Object.keys(guest.lessonProgress)) await account.save(guest, { type: "lessonStarted", lessonId: id }, empty);
  if (guest.portfolio) await account.save(guest, { type: "portfolio" }, empty);
  await account.save(guest, { type: "tutorTopics" }, { ...guest, activityDays: [] });
  return account.load();
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppStateProvider");
  return v;
}
