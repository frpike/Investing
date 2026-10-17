import Link from "next/link";
import { Fragment } from "react";
import { getLesson } from "@/content";

// Renders the small markup used in course content and tutor answers:
// **bold** and [[lesson:id]] links. Everything else is plain text (no HTML injection).
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\[lesson:[a-z0-9-]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        const m = /^\[\[lesson:([a-z0-9-]+)\]\]$/.exec(part);
        if (m) {
          const ref = getLesson(m[1]);
          return ref
            ? <Link key={i} href={`/learn/${m[1]}`} className="font-medium text-primary underline underline-offset-4">Lesson: {ref.lesson.title}</Link>
            : <Fragment key={i} />;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="mb-3 whitespace-pre-wrap last:mb-0"><Inline text={p} /></p>
      ))}
    </div>
  );
}
