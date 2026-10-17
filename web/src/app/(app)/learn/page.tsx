import type { Metadata } from "next";
import Link from "next/link";
import { MODULES } from "@/content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge } from "./lesson-status";

export const metadata: Metadata = { title: "Course" };

export default function CataloguePage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold">The course</h1>
        <p className="text-muted-foreground">Ten modules that take you from zero to making informed decisions on your own. Each lesson has worked examples, something interactive and a short quiz.</p>
      </div>
      <div className="grid gap-4">
        {MODULES.map((m) => (
          <Card key={m.id} className={m.status === "coming_soon" ? "opacity-80" : undefined}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardDescription className="tabular">Module {m.position}</CardDescription>
                {m.status === "coming_soon" && <Badge variant="outline">Coming soon</Badge>}
              </div>
              <CardTitle className="text-xl">{m.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{m.summary}</p>
            </CardHeader>
            <CardContent>
              {m.status === "available" ? (
                <ol className="divide-y rounded-lg border">
                  {m.lessons.map((l, i) => (
                    <li key={l.id}>
                      <Link href={`/learn/${l.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/60">
                        <span className="w-6 text-muted-foreground tabular">{i + 1}</span>
                        <span className="flex-1 font-medium">{l.title}</span>
                        <LessonStatusBadge lessonId={l.id} />
                        <span className="text-xs text-muted-foreground">{l.minutes} min</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {m.outline.map((t) => <li key={t}>· {t}</li>)}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
