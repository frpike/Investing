"use client";

import { FileUp } from "lucide-react";
import { useId, useState } from "react";
import { useApp } from "@/components/app-state";
import { Button } from "@/components/ui/button";
import { gbp, newId } from "@/lib/format";
import { importTrading212Csv, type ImportResult } from "@/lib/portfolio/import-trading212";
import { applyImport, ensurePortfolio } from "@/lib/store/actions";

const MAX_BYTES = 5 * 1024 * 1024;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parse a Trading 212 CSV in the browser, show a preview, and save only after the learner confirms. */
export function CsvImport({ onDone }: { onDone?: () => void }) {
  const id = useId();
  const { apply, data } = useApp();
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null); setResult(null);
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) return setError("That file is over 5 MB. Export a shorter date range.");
    if (!/\.csv$/i.test(f.name)) return setError("Choose a .csv file exported from Trading 212.");
    const text = await f.text();
    setFile({ name: f.name, text });
    setResult(importTrading212Csv(text));
  }

  async function confirm() {
    if (!result || !file) return;
    const entry = {
      id: newId(), source: "csv_trading212" as const, fileName: file.name, fileSha256: await sha256(file.text), at: new Date().toISOString(),
      rowsTotal: result.rowsTotal, rowsImported: result.rowsImported, rowsRejected: result.errors.length, errors: result.errors,
    };
    const portfolioId = ensurePortfolio(data, newId(), new Date()).id;
    await apply((d) => applyImport(d, result, entry, portfolioId, newId, new Date()));
    setFile(null); setResult(null);
    onDone?.();
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>In the Trading 212 app or website, open your account history and choose to export it as CSV. Pick a date range that covers everything since you started.</li>
        <li>Choose the file below. It&apos;s read in your browser first, so you can check it before anything is saved.</li>
      </ol>
      <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-6 hover:bg-muted/60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <FileUp className="size-5 text-primary" aria-hidden />
        <span className="text-sm">{file ? file.name : "Choose a Trading 212 CSV export"}</span>
        <input id={id} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} />
      </label>
      {error && <p className="text-sm text-loss" role="alert">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-lg border p-4 text-sm" aria-live="polite">
          {result.ok ? (
            <>
              <p><strong>{result.rowsImported}</strong> of {result.rowsTotal} rows read. Found {result.holdings.length} current holding{result.holdings.length === 1 ? "" : "s"}.</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                <li>Deposited: {gbp(result.depositsTotal)}</li>
                <li>Withdrawn: {gbp(result.withdrawalsTotal)}</li>
                <li>Dividends: {gbp(result.dividendsTotal)}</li>
                <li>Realised gains/losses: {gbp(result.realisedTotal)}</li>
              </ul>
              <p className="text-muted-foreground">The export has no current prices, so holdings will show as &ldquo;value unknown&rdquo; until you add a price. Prices you&apos;ve already typed in are kept.</p>
            </>
          ) : <p className="text-loss">Nothing could be imported.</p>}
          {result.errors.length > 0 && (
            <details><summary className="cursor-pointer">{result.errors.length} row{result.errors.length === 1 ? "" : "s"} couldn&apos;t be read</summary>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">{result.errors.slice(0, 20).map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}</ul>
            </details>
          )}
          {result.warnings.length > 0 && (
            <details><summary className="cursor-pointer">{result.warnings.length} note{result.warnings.length === 1 ? "" : "s"}</summary>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">{result.warnings.slice(0, 20).map((w) => <li key={w}>{w}</li>)}</ul>
            </details>
          )}
          <div className="flex gap-2">
            <Button onClick={confirm} disabled={!result.ok}>Import</Button>
            <Button variant="ghost" onClick={() => { setFile(null); setResult(null); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
