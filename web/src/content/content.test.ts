import { describe, expect, it } from "vitest";
import { CONCEPT_BY_ID, CONCEPTS } from "./concepts";
import { DIAGNOSTIC } from "./diagnostic";
import { LESSONS, MODULES, QUESTIONS } from "./index";
import { ConceptSchema, ModuleSchema, QuestionSchema } from "./schema";

describe("course content", () => {
  it("every module matches the schema", () => {
    for (const m of MODULES) expect(() => ModuleSchema.parse(m), m.id).not.toThrow();
  });

  it("has ten modules in order, with Module 1 available", () => {
    expect(MODULES.map((m) => m.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(MODULES[0].status).toBe("available");
    expect(MODULES[0].lessons).toHaveLength(7);
  });

  it("uses unique lesson and question ids", () => {
    const lessonIds = LESSONS.map((l) => l.lesson.id);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    const qIds = LESSONS.flatMap(({ lesson }) => [...lesson.quiz, ...lesson.blocks.flatMap((b) => (b.type === "check" ? [b.question] : []))]).map((q) => q.id);
    expect(new Set(qIds).size).toBe(qIds.length);
    expect(QUESTIONS.size).toBe(qIds.length);
  });

  it("every question's correct answer is one of its options, and options are unique", () => {
    for (const q of [...QUESTIONS.values(), ...DIAGNOSTIC]) {
      QuestionSchema.parse(q);
      const ids = q.options.map((o) => o.id);
      expect(new Set(ids).size, q.id).toBe(ids.length);
      expect(ids, q.id).toContain(q.correctOptionId);
    }
  });

  it("refers only to concepts that exist", () => {
    for (const c of CONCEPTS) ConceptSchema.parse(c);
    for (const { lesson } of LESSONS) {
      for (const id of lesson.conceptIds) expect(CONCEPT_BY_ID.has(id), id).toBe(true);
      for (const q of lesson.quiz) expect(CONCEPT_BY_ID.has(q.conceptId), q.id).toBe(true);
    }
    for (const q of DIAGNOSTIC) expect(CONCEPT_BY_ID.has(q.conceptId), q.id).toBe(true);
    for (const c of CONCEPTS) for (const p of c.prerequisites) expect(CONCEPT_BY_ID.has(p), `${c.id} -> ${p}`).toBe(true);
  });

  it("has no cycles in the concept prerequisites", () => {
    const visiting = new Set<string>(), done = new Set<string>();
    const visit = (id: string) => {
      expect(visiting.has(id), `cycle at ${id}`).toBe(false);
      if (done.has(id)) return;
      visiting.add(id);
      CONCEPT_BY_ID.get(id)!.prerequisites.forEach(visit);
      visiting.delete(id); done.add(id);
    };
    CONCEPTS.forEach((c) => visit(c.id));
  });

  it("gives every history callout a source", () => {
    for (const { lesson } of LESSONS)
      for (const b of lesson.blocks) if (b.type === "callout" && b.tone === "history") expect(b.source, lesson.id).toBeTruthy();
  });

  it("covers the seven diagnostic topics, each with an 'I'm not sure' option", () => {
    expect(DIAGNOSTIC).toHaveLength(7);
    for (const q of DIAGNOSTIC) expect(q.options.some((o) => o.id === "unsure")).toBe(true);
  });
});
