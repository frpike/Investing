import { ArrowLeft, ArrowRight, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLesson, LESSONS } from "@/content";
import { BlockView } from "@/components/learn/block-view";
import { QuizRunner } from "@/components/learn/quiz-runner";
import { EducationNote } from "@/components/notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonStatusBadge, MarkStarted } from "../lesson-status";

export function generateStaticParams() {
  return LESSONS.map(({ lesson }) => ({ lessonId: lesson.id }));
}

export async function generateMetadata({ params }: PageProps<"/learn/[lessonId]">): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: getLesson(lessonId)?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/learn/[lessonId]">) {
  const { lessonId } = await params;
  const ref = getLesson(lessonId);
  if (!ref) notFound();
  const { lesson, module, index } = ref;
  const prev = module.lessons[index - 1];
  const next = module.lessons[index + 1];

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <MarkStarted lessonId={lesson.id} />
      <header className="space-y-3">
        <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">Module {module.position} · {module.title}</Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold md:text-4xl">{lesson.title}</h1>
          <LessonStatusBadge lessonId={lesson.id} />
        </div>
        <p className="text-sm text-muted-foreground">Lesson {index + 1} of {module.lessons.length} · about {lesson.minutes} minutes</p>
        {index === 0 && <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">{module.intro.map((p) => <p key={p}>{p}</p>)}</div>}
      </header>

      {lesson.blocks.map((b, i) => <BlockView key={i} block={b} />)}

      <Card>
        <CardHeader><CardTitle className="text-base">Put it into practice: {lesson.practical.title}</CardTitle></CardHeader>
        <CardContent><ol className="list-decimal space-y-1 pl-5">{lesson.practical.steps.map((s) => <li key={s}>{s}</li>)}</ol></CardContent>
      </Card>

      <section aria-labelledby="takeaways" className="rounded-xl border-l-4 border-primary bg-card p-5">
        <h2 id="takeaways" className="mb-2 text-xl font-semibold">Key takeaways</h2>
        <ul className="list-disc space-y-1 pl-5">{lesson.takeaways.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      <section aria-labelledby="quiz" className="space-y-4">
        <h2 id="quiz" className="text-2xl font-semibold">Check your understanding</h2>
        <p className="text-sm text-muted-foreground">Get at least {Math.ceil(lesson.quiz.length * (2 / 3))} of {lesson.quiz.length} right to complete the lesson. Wrong answers point you to what to revisit.</p>
        <QuizRunner questions={lesson.quiz} lessonId={lesson.id} context="lesson" />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        {prev ? <Button asChild variant="ghost" className="h-auto max-w-full whitespace-normal py-2 text-left"><Link href={`/learn/${prev.id}`}><ArrowLeft />{prev.title}</Link></Button> : <span />}
        <Button asChild variant="outline" className="h-auto max-w-full whitespace-normal py-2"><Link href={`/tutor?q=${encodeURIComponent(`I've just read the lesson "${lesson.title}". Can you check my understanding?`)}`}><MessageCircle />Ask the tutor about this</Link></Button>
        {next && <Button asChild className="h-auto max-w-full whitespace-normal py-2 text-left"><Link href={`/learn/${next.id}`}>{next.title}<ArrowRight /></Link></Button>}
      </div>
      <EducationNote />
    </article>
  );
}
