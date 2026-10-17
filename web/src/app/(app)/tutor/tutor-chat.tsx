"use client";

import { ExternalLink, RotateCcw, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getLesson } from "@/content";
import { useApp } from "@/components/app-state";
import { EducationNote } from "@/components/notes";
import { Paragraphs } from "@/components/prose";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LESSON_LINK } from "@/lib/tutor/prompt";
import { noteTutorTopics } from "@/lib/store/actions";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; sources?: { url: string; title: string }[]; notice?: string; error?: boolean }

const EXAMPLES = [
  "What exactly am I buying when I buy a share?",
  "What's the difference between an ETF and an individual stock?",
  "Why can a good company still be a bad investment?",
  "What does a price-to-earnings ratio actually tell me?",
  "Why is my portfolio down even though most of my investments are up?",
  "What risks am I exposed to in my current portfolio?",
  "Test me on everything I've learned this week.",
];
const SESSION_KEY = "groundwork:tutor:v1";

export function TutorChat() {
  const { data, mode, apply } = useApp();
  const params = useSearchParams();
  // This component only renders in the browser (it sits under a Suspense boundary that reads search params),
  // so session storage and the URL can seed state directly.
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]") as Msg[]; } catch { return []; }
  });
  const [input, setInput] = useState(() => (params.get("q") ?? "").slice(0, 2000));
  const [busy, setBusy] = useState(false);
  const [shareData, setShareData] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function guestContext() {
    if (mode !== "guest" || !shareData) return undefined;
    return {
      experience: data.prefs?.experience, focus: data.prefs?.focus, horizon: data.prefs?.horizon,
      lessonsCompleted: Object.values(data.lessonProgress).filter((p) => p.status === "completed").map((p) => p.lessonId),
      mastery: Object.fromEntries(Object.values(data.concepts).map((c) => [c.conceptId, c.mastery])),
      portfolio: data.portfolio ? { baseCurrency: data.portfolio.baseCurrency, holdings: data.portfolio.holdings.slice(0, 200) } : null,
    };
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    let answer = "";
    const patch = (p: Partial<Msg>) => setMessages((ms) => { const copy = [...ms]; copy[copy.length - 1] = { ...copy[copy.length - 1], ...p }; return copy; });
    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })), context: guestContext() }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "The tutor couldn't be reached." }));
        patch({ content: err.error ?? "The tutor couldn't be reached.", error: true });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.type === "text") { answer += ev.text; patch({ content: answer }); }
          else if (ev.type === "sources") patch({ sources: ev.sources });
          else if (ev.type === "notice") patch({ notice: ev.message });
          else if (ev.type === "error") patch({ content: answer || ev.message, error: !answer, notice: answer ? ev.message : undefined });
        }
      }
      const concepts = [...answer.matchAll(LESSON_LINK)].flatMap((m) => getLesson(m[1])?.lesson.conceptIds ?? []);
      if (concepts.length) void apply((d) => noteTutorTopics(d, [...new Set(concepts)], new Date()));
    } catch {
      patch({ content: answer || "Connection lost. Try again.", error: !answer });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Tutor</h1>
          <p className="text-sm text-muted-foreground">Ask about any concept, your lessons or your portfolio. It explains and teaches; it won&apos;t tell you what to buy or sell, and it can make mistakes.</p>
        </div>
        {messages.length > 0 && <Button variant="ghost" size="sm" onClick={() => setMessages([])}><RotateCcw />New chat</Button>}
      </div>

      {messages.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((q) => (
              <button key={q} type="button" onClick={() => send(q)} className="rounded-full border bg-card px-3 py-1.5 text-left text-sm hover:bg-muted">{q}</button>
            ))}
          </div>
        </div>
      )}

      <ol className="space-y-4" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={cn("rounded-xl px-4 py-3", m.role === "user" ? "ml-auto max-w-[85%] bg-primary text-primary-foreground" : "border bg-card", m.error && "border-loss/40 bg-loss/5")}>
            <span className="sr-only">{m.role === "user" ? "You said:" : "Tutor:"}</span>
            {m.role === "assistant" && !m.content && busy && i === messages.length - 1
              ? <p className="animate-pulse text-sm text-muted-foreground">Thinking…</p>
              : <Paragraphs text={m.content} className="text-[0.975rem] leading-relaxed" />}
            {m.notice && <p className="mt-2 text-xs text-muted-foreground">{m.notice}</p>}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Sources</p>
                <ul className="space-y-1 text-xs">{m.sources.map((s) => (
                  <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-2">{s.title}<ExternalLink className="size-3" aria-hidden /></a></li>
                ))}</ul>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div ref={endRef} />

      <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="sticky bottom-20 space-y-2 rounded-xl border bg-background p-3 shadow-sm md:bottom-4">
        <label htmlFor="tutor-input" className="sr-only">Your question</label>
        <Textarea id="tutor-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} rows={2} placeholder="Ask a question…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {mode === "guest" ? (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={shareData} onChange={(e) => setShareData(e.target.checked)} />
              Share my progress and portfolio from this browser with the tutor
            </label>
          ) : <span className="text-xs text-muted-foreground">The tutor reads your progress and portfolio from your account.</span>}
          <Button type="submit" size="sm" disabled={busy || !input.trim()}><Send />Ask</Button>
        </div>
      </form>
      <EducationNote />
    </div>
  );
}
