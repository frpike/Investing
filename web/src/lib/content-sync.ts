import { CONTENT_VERSION, MODULES } from "@/content";
import { DIAGNOSTIC } from "@/content/diagnostic";

/** Rows mirroring /content in the database, so progress tables can reference lessons by id. */
export function contentRows() {
  const modules = MODULES.map((m) => ({
    id: m.id, position: m.position, title: m.title, summary: m.summary, status: m.status, content_version: CONTENT_VERSION,
  }));
  const lessons = MODULES.flatMap((m) => m.lessons.map((l, i) => ({
    id: l.id, module_id: m.id, position: i + 1, title: l.title, concept_ids: l.conceptIds, content_version: CONTENT_VERSION,
  })));
  const questions = [
    ...MODULES.flatMap((m) => m.lessons.flatMap((l) => [
      ...l.quiz,
      ...l.blocks.flatMap((b) => (b.type === "check" ? [b.question] : [])),
    ].map((q) => ({ id: q.id, lesson_id: l.id, concept_id: q.conceptId, is_diagnostic: false, content_version: CONTENT_VERSION })))),
    ...DIAGNOSTIC.map((q) => ({ id: q.id, lesson_id: null, concept_id: q.conceptId, is_diagnostic: true, content_version: CONTENT_VERSION })),
  ];
  return { modules, lessons, questions };
}
