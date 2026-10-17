"use client";

import { useEffect } from "react";
import { useApp } from "@/components/app-state";
import { Badge } from "@/components/ui/badge";
import { startLesson } from "@/lib/store/actions";

export function LessonStatusBadge({ lessonId }: { lessonId: string }) {
  const { data, ready } = useApp();
  if (!ready) return null;
  const s = data.lessonProgress[lessonId]?.status;
  if (s === "completed") return <Badge className="bg-gain/15 text-gain hover:bg-gain/15">Done</Badge>;
  if (s === "started") return <Badge variant="secondary">In progress</Badge>;
  return null;
}

/** Marks a lesson as started the first time it's opened. */
export function MarkStarted({ lessonId }: { lessonId: string }) {
  const { apply, ready } = useApp();
  useEffect(() => { if (ready) void apply((d) => startLesson(d, lessonId)); }, [ready, lessonId, apply]);
  return null;
}
