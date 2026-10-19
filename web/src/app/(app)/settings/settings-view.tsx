"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Trading212Sync } from "@/components/portfolio/trading212-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { date } from "@/lib/format";
import { setPrefs } from "@/lib/store/actions";

export function SettingsView() {
  const { data, ready, mode, user, apply, exportAll, deleteAll, signOut, accountsEnabled } = useApp();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  if (!ready) return <p className="text-muted-foreground">Loading…</p>;

  async function download() {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `groundwork-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  async function remove() {
    setDeleting(true);
    try { await deleteAll(); router.push("/"); } finally { setDeleting(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>{mode === "account" ? `Signed in as ${user?.email ?? "you"}. Progress is saved to your account.` : "Guest mode: progress is saved in this browser only."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {mode === "account" ? <Button variant="outline" onClick={signOut}>Sign out</Button>
            : accountsEnabled ? <Button asChild><Link href="/sign-in">Create an account to save progress</Link></Button>
            : <p className="text-sm text-muted-foreground">Accounts aren&apos;t switched on for this deployment.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Learning preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (name !== null) void apply((d) => setPrefs(d, d.prefs ?? {}, new Date(), name.trim() || null)); }}>
            <div className="grid flex-1 gap-1.5"><Label htmlFor="display-name">Name</Label>
              <Input id="display-name" maxLength={80} value={name ?? data.profile.displayName ?? ""} onChange={(e) => setName(e.target.value)} /></div>
            <Button type="submit" variant="outline">Save</Button>
          </form>
          <p className="text-sm text-muted-foreground">{data.onboardedAt ? `Set up on ${date(data.onboardedAt)}.` : "Not set up yet."} {data.diagnostic ? `Knowledge check taken ${date(data.diagnostic.takenAt)}.` : ""}</p>
          <Button asChild variant="outline"><Link href="/start">Change answers or retake the knowledge check</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Broker connections</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Trading212Sync />
          <p className="text-muted-foreground">Direct connection works in personal mode only: the owner of this copy of the app connects their own account with a read-only key kept on the server. Trading 212&apos;s API terms need their written permission before it can be offered to other people. To disconnect, remove the key from the server&apos;s settings and delete it in the Trading 212 app.</p>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div><p className="font-medium">Trading 212 CSV import</p><p className="text-muted-foreground">{data.imports.length ? `${data.imports.length} import(s), last on ${date(data.imports.at(-1)!.at)}.` : "No imports yet."} We never ask for your Trading 212 password.</p></div>
            <Button asChild size="sm" variant="outline"><Link href="/portfolio">Open</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Your data</CardTitle><CardDescription>See <Link href="/privacy" className="underline">Privacy and data</Link> for what we store and why.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2"><p className="text-sm">Download everything we hold about you as a JSON file.</p><Button variant="outline" onClick={download}>Export my data</Button></div>
          <div className="space-y-2 rounded-lg border border-loss/30 p-4">
            <p className="text-sm font-medium">{mode === "account" ? "Delete my account and all data" : "Clear everything from this browser"}</p>
            <p className="text-sm text-muted-foreground">{mode === "account" ? "Permanently deletes your account, progress, portfolio, imports and tutor history. This can't be undone." : "Removes your progress and portfolio from this browser. This can't be undone."}</p>
            <Label htmlFor="confirm-delete" className="text-sm">Type DELETE to confirm</Label>
            <div className="flex gap-2">
              <Input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="max-w-40" autoComplete="off" />
              <Button variant="destructive" disabled={confirm !== "DELETE" || deleting} onClick={remove}>{deleting ? "Deleting…" : "Delete"}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
