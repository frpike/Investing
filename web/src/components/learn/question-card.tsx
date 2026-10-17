"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useId } from "react";
import type { Question } from "@/content/schema";
import { cn } from "@/lib/utils";

/** One multiple-choice question. Controlled: the parent owns the chosen answer and reveal state. */
export function QuestionCard({
  question, chosen, onChoose, revealed, index,
}: {
  question: Question;
  chosen: string | undefined;
  onChoose: (optionId: string) => void;
  revealed: boolean;
  index?: number;
}) {
  const name = useId();
  const picked = question.options.find((o) => o.id === chosen);
  const correct = chosen === question.correctOptionId;
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 font-medium leading-snug">
        {index != null && <span className="mr-2 text-muted-foreground tabular">{index + 1}.</span>}
        {question.prompt}
      </legend>
      <div className="grid gap-2">
        {question.options.map((o) => {
          const isChosen = chosen === o.id;
          const isRight = o.id === question.correctOptionId;
          return (
            <label key={o.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                !revealed && "hover:bg-muted/70",
                !revealed && isChosen && "border-primary bg-accent",
                revealed && isRight && "border-gain/60 bg-gain/10",
                revealed && isChosen && !isRight && "border-loss/60 bg-loss/10",
                revealed && "cursor-default",
              )}>
              <input type="radio" name={name} value={o.id} checked={isChosen} disabled={revealed}
                onChange={() => onChoose(o.id)} className="mt-0.5 accent-[var(--primary)]" />
              <span className="flex-1">{o.text}</span>
              {revealed && isRight && <CheckCircle2 className="size-4 text-gain" aria-label="Correct answer" />}
              {revealed && isChosen && !isRight && <XCircle className="size-4 text-loss" aria-label="Your answer" />}
            </label>
          );
        })}
      </div>
      {revealed && (
        <div className={cn("rounded-lg px-4 py-3 text-sm", correct ? "bg-gain/10" : "bg-muted")} aria-live="polite">
          {picked && <p className="mb-1"><strong>{correct ? "Correct." : picked.id === "unsure" ? "No problem." : "Not quite."}</strong> {picked.feedback}</p>}
          {!picked && <p className="mb-1"><strong>Not answered.</strong></p>}
          <p className="text-muted-foreground">{question.explanation}</p>
        </div>
      )}
    </fieldset>
  );
}
