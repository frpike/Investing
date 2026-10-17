"use client";

import { BookMarked, History, Lightbulb } from "lucide-react";
import { useState } from "react";
import type { Block } from "@/content/schema";
import { Inline } from "@/components/prose";
import { InfoNote, RiskNote } from "@/components/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Exercise } from "./exercises";
import { QuestionCard } from "./question-card";

function Check({ block }: { block: Extract<Block, { type: "check" }> }) {
  const [chosen, setChosen] = useState<string>();
  const [revealed, setRevealed] = useState(false);
  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Quick check</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <QuestionCard question={block.question} chosen={chosen} onChoose={setChosen} revealed={revealed} />
        {!revealed && <Button size="sm" disabled={!chosen} onClick={() => setRevealed(true)}>Check answer</Button>}
      </CardContent>
    </Card>
  );
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <div className="space-y-4 text-[1.0625rem] leading-relaxed">{block.body.map((p, i) => <p key={i}><Inline text={p} /></p>)}</div>;
    case "analogy":
      return (
        <aside className="rounded-xl border bg-accent/50 p-5">
          <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="size-4 text-primary" aria-hidden />Everyday analogy: {block.title}</p>
          <p className="leading-relaxed">{block.body}</p>
        </aside>
      );
    case "keyTerm":
      return (
        <dl className="rounded-xl border-l-4 border-primary bg-card px-5 py-4">
          <dt className="mb-1 flex items-center gap-2 font-semibold"><BookMarked className="size-4 text-primary" aria-hidden />{block.term}</dt>
          <dd className="text-muted-foreground">{block.definition}</dd>
        </dl>
      );
    case "callout":
      if (block.tone === "risk") return <RiskNote title={block.title}>{block.body}</RiskNote>;
      if (block.tone === "history") {
        return (
          <aside className="rounded-xl border p-5">
            <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-muted-foreground" aria-hidden />Historical data: {block.title}</p>
            <p className="leading-relaxed">{block.body}</p>
            {block.source && <p className="mt-2 text-xs text-muted-foreground">Source: {block.source} Past performance doesn&apos;t predict future returns.</p>}
          </aside>
        );
      }
      return <InfoNote title={block.title}>{block.body}</InfoNote>;
    case "workedExample":
      return (
        <Card>
          <CardHeader><CardTitle className="text-base">Worked example: {block.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">{block.setup}</p>
            <ol className="space-y-2">
              {block.steps.map((s, i) => (
                <li key={i} className="grid gap-1 rounded-lg bg-muted px-4 py-2 sm:grid-cols-[minmax(10rem,auto)_1fr] sm:gap-4">
                  <span className="text-sm text-muted-foreground">{i + 1}. {s.label}</span>
                  <span className="font-mono text-sm tabular">{s.working}</span>
                </li>
              ))}
            </ol>
            <p className="font-medium">{block.result}</p>
          </CardContent>
        </Card>
      );
    case "exercise":
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{block.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{block.prompt}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Exercise kind={block.kind} />
            <p className="text-sm"><strong>Think about it:</strong> {block.reflect}</p>
          </CardContent>
        </Card>
      );
    case "check":
      return <Check block={block} />;
  }
}
