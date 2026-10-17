import { module1 } from "./modules/m1";
import { OUTLINE_MODULES } from "./modules/outlines";
import type { Lesson, Module, Question } from "./schema";

export const CONTENT_VERSION = "2026-10-17";
export const MODULES: Module[] = [module1, ...OUTLINE_MODULES].sort((a, b) => a.position - b.position);

export interface LessonRef {
  lesson: Lesson;
  module: Module;
  index: number;
}

export const LESSONS: LessonRef[] = MODULES.flatMap((module) =>
  module.lessons.map((lesson, index) => ({ lesson, module, index })),
);

export const getModule = (id: string) => MODULES.find((m) => m.id === id);
export const getLesson = (id: string) => LESSONS.find((l) => l.lesson.id === id);

/** Every question in the course (quiz questions plus in-lesson checks), keyed by id. */
export const QUESTIONS: Map<string, Question> = new Map(
  LESSONS.flatMap(({ lesson }) => [
    ...lesson.quiz,
    ...lesson.blocks.flatMap((b) => (b.type === "check" ? [b.question] : [])),
  ]).map((q) => [q.id, q]),
);

/** The lesson that teaches a concept, if one exists yet. */
export function lessonForConcept(conceptId: string): LessonRef | undefined {
  return LESSONS.find(({ lesson }) => lesson.conceptIds.includes(conceptId));
}
