"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GuestStore } from "@/lib/store/guest-store";
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
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<"guest" | "account">("guest");
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
    setReady(true);
  }, [supabase]);

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
  }), [ready, data, user, mode, apply, supabase]);

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
