import { AlertTriangle, FlaskConical, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Standard banners that keep education, hypotheticals and real data visibly separate. */
export function EducationNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Education only, not financial advice. Investments can fall as well as rise, and you may get back less than you put in.
    </p>
  );
}

export function HypotheticalBanner({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border border-caution/40 bg-caution-bg px-4 py-3 text-sm", className)} role="note">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
      <div>
        <strong className="font-semibold">Hypothetical.</strong>{" "}
        {children ?? "These numbers are illustrations, not predictions. Real markets are messier and nothing here says what will happen."}
      </div>
    </div>
  );
}

export function RiskNote({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-sm", className)} role="note">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-loss" aria-hidden />
      <div><strong className="font-semibold">{title}</strong> {children}</div>
    </div>
  );
}

export function InfoNote({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border bg-muted/60 px-4 py-3 text-sm", className)} role="note">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>{title && <strong className="font-semibold">{title} </strong>}{children}</div>
    </div>
  );
}
