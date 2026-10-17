import { MODULES, lessonForConcept } from "@/content";
import { CONCEPT_BY_ID } from "@/content/concepts";
import type { LearningPreferences, LessonProgress } from "./types";

export interface LearningPlan {
  stage: string;
  /** Modules in the suggested order. */
  moduleOrder: string[];
  /** Concepts the diagnostic showed are new or shaky, in course order. */
  focusConcepts: string[];
  notes: string[];
}

// The plan is built only from what the learner told us and what they demonstrated.
// It never infers risk tolerance or circumstances from anything else.
export function buildPlan(prefs: LearningPreferences, diagnostic: Record<string, number> | null): LearningPlan {
  const notes: string[] = [];
  const known = (id: string) => (diagnostic?.[id] ?? 0) >= 1;
  const coreFoundations = ["percent-returns", "compound-growth"].every(known);
  const confidentNumbers = (prefs.numeracyConfidence ?? 0) >= 4;

  const order = ["m1", "m2", "m3", "m4"];
  if (prefs.focus === "companies") order.push("m5", "m8", "m6", "m7", "m9", "m10");
  else if (prefs.focus === "long_term") order.push("m6", "m7", "m9", "m5", "m8", "m10");
  else order.push("m5", "m6", "m7", "m8", "m9", "m10");

  let stage = "Foundations";
  if (coreFoundations && confidentNumbers) {
    stage = "Foundations review";
    notes.push("You got the core maths right, so Module 1 is optional review. Skim it, take the quizzes, and move on when they feel easy.");
  } else {
    notes.push("Start with Module 1. It builds the maths every later lesson relies on, one step at a time.");
  }

  const focusConcepts = diagnostic
    ? Object.entries(diagnostic).filter(([, v]) => v < 1).map(([k]) => k)
        .sort((a, b) => moduleIndex(a) - moduleIndex(b))
    : [];
  if (focusConcepts.length) {
    notes.push(`Topics to focus on: ${focusConcepts.map((c) => CONCEPT_BY_ID.get(c)?.title ?? c).join(", ")}.`);
  }
  if (prefs.horizon === "under_2y") {
    notes.push("You mentioned a time horizon under two years. Lessons on saving versus investing and on time horizons will be especially relevant.");
  }
  if (prefs.hasTrading212 === "yes") {
    notes.push("Once you're comfortable, import your Trading 212 history in Portfolio to learn with your own holdings.");
  }
  return { stage, moduleOrder: order, focusConcepts, notes };
}

/** The next lesson to take: the first incomplete available lesson, following the plan's module order. */
export function nextLesson(plan: LearningPlan | null, progress: LessonProgress[]): string | null {
  const done = new Set(progress.filter((p) => p.status === "completed").map((p) => p.lessonId));
  const order = plan?.moduleOrder ?? MODULES.map((m) => m.id);
  for (const id of order) {
    const mod = MODULES.find((m) => m.id === id);
    if (!mod || mod.status !== "available") continue;
    const next = mod.lessons.find((l) => !done.has(l.id));
    if (next) return next.id;
  }
  return null;
}

/** Where a concept is taught, so "revisit" suggestions can link straight to a lesson. */
export function lessonLinkForConcept(conceptId: string): { lessonId: string; title: string } | null {
  const ref = lessonForConcept(conceptId);
  return ref ? { lessonId: ref.lesson.id, title: ref.lesson.title } : null;
}

const moduleIndex = (conceptId: string) => Number(CONCEPT_BY_ID.get(conceptId)?.moduleId.slice(1) ?? 99);
