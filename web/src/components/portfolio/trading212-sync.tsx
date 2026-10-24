"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/app-state";
import { InfoNote } from "@/components/notes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CODE_KEY, savedCode, syncTrading212 } from "@/lib/broker/client-sync";
import { gbp } from "@/lib/format";

/** Personal-mode Trading 212 sync. Only appears when the deployment owner has switched it on. */
export function Trading212Sync({ compact = false }: { compact?: boolean }) {
  const { data, apply, personal: status, storage, connectPersonal } = useApp();
  const [code, setCode] = useState(savedCode);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = data.snapshots.at(-1);

  async function sync() {
    setBusy(true); setError(null);
    try {
      const r = await syncTrading212(code, apply);
      if (!r.ok) { setError(r.error); return; }
      try { if (remember) localStorage.setItem(CODE_KEY, code); else localStorage.removeItem(CODE_KEY); } catch { /* storage blocked */ }
      if (status?.fileStorage && storage === "browser") {
        const c = await connectPersonal(code);
        if (c.ok) toast.success("Your progress is now also saved on this computer.");
      }
      toast.success(`Synced ${r.count} holding${r.count === 1 ? "" : "s"} from Trading 212${r.cached ? " (from the last minute)" : ""}.`);
      if (!r.historyComplete) toast.message("Only your most recent transactions were fetched. Import a CSV export for full history.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status === null) return null;
  if (!status.enabled) {
    return compact ? null : (
      <InfoNote title="Connect your own Trading 212 account:">
        Personal mode isn&apos;t switched on for this deployment. If this is your own copy of the app, add a read-only Trading 212 API key and an access code to the server&apos;s environment variables (see the setup guide). Otherwise, use CSV import below.
      </InfoNote>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">Trading 212</CardTitle>
          <Badge variant={status.environment === "demo" ? "outline" : "secondary"}>{status.environment === "demo" ? "Demo account" : "Live account"}</Badge>
          <Badge variant="outline">Read-only · personal mode</Badge>
          {storage === "computer" && <Badge variant="outline">Progress saved on this computer</Badge>}
        </div>
        <CardDescription>
          {last ? <>Last synced {new Date(last.takenAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}. Trading 212 reported a total of {gbp(last.totalValue)}, including {gbp(last.cash)} cash.</> : "Not synced yet."}
          {" "}It syncs by itself when you open the app (at most every 15 minutes). Prices are Trading 212&apos;s at that moment and may be delayed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); void sync(); }}>
          <div className="grid gap-1.5">
            <Label htmlFor="t212-code">Access code</Label>
            <Input id="t212-code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} className="w-56" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Remember on this device
          </label>
          <Button type="submit" disabled={busy || !code}><RefreshCw className={busy ? "animate-spin" : undefined} />{busy ? "Syncing…" : "Sync now"}</Button>
        </form>
        {error && <p className="mt-3 text-sm text-loss" role="alert">{error}</p>}
      </CardContent>
    </Card>
  );
}
