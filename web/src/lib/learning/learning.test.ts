import { describe, expect, it } from "vitest";
import { DIAGNOSTIC } from "@/content/diagnostic";
import { getLesson } from "@/content";
import { unmetPrerequisites } from "./graph";
import { applyAnswer, dueForReview, emptyConcept, needsRevision } from "./mastery";
import { buildPlan, nextLesson } from "./plan";
import { calibrationGap, scoreByConcept, scoreQuiz } from "./scoring";

const now = new Date("2026-10-17T12:00:00Z");

describe("quiz scoring", () => {
  const quiz = getLesson("compound-growth")!.lesson.quiz;

  it("scores correct answers and lists concepts to revisit", () => {
    const s = scoreQuiz(quiz, { [quiz[0].id]: quiz[0].correctOptionId, [quiz[1].id]: "a", [quiz[2].id]: quiz[2].correctOptionId });
    expect(s.correct).toBe(2);
    expect(s.total).toBe(3);
    expect(s.score).toBeCloseTo(2 / 3);
    expect(s.conceptsToRevisit).toEqual([quiz[1].conceptId]);
  });

  it("counts unanswered and 'not sure' as not correct, and flags them as unsure", () => {
    const s = scoreQuiz(DIAGNOSTIC, { "diag-shares": "unsure" });
    expect(s.correct).toBe(0);
    expect(s.results.every((r) => r.unsure)).toBe(true);
    expect(scoreByConcept(s).shares).toBe(0);
  });

  it("handles an empty quiz without dividing by zero", () => {
    expect(scoreQuiz([], {}).score).toBe(0);
  });

  it("measures over-confidence only with enough rated attempts", () => {
    expect(calibrationGap([{ score: 1, confidence: 5 }])).toBeNull();
    const gap = calibrationGap([{ score: 0.33, confidence: 5 }, { score: 0.33, confidence: 5 }, { score: 0.33, confidence: 5 }]);
    expect(gap).toBeCloseTo(0.67, 2);
  });
});

describe("mastery and spaced repetition", () => {
  it("raises mastery and spaces reviews further apart on correct answers", () => {
    let s = emptyConcept("inflation");
    s = applyAnswer(s, true, now);
    expect(s.mastery).toBeCloseTo(0.35);
    expect(s.intervalDays).toBe(1);
    s = applyAnswer(s, true, now);
    expect(s.intervalDays).toBe(3);
    s = applyAnswer(s, true, now);
    expect(s.intervalDays).toBeGreaterThan(3);
    expect(s.mastery).toBeGreaterThan(0.7);
  });

  it("halves mastery and brings the review back to tomorrow on a wrong answer", () => {
    let s = applyAnswer(applyAnswer(emptyConcept("x"), true, now), true, now);
    const before = s.mastery;
    s = applyAnswer(s, false, now);
    expect(s.mastery).toBeCloseTo(before / 2, 2);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(new Date(now.getTime() + 86_400_000).toISOString());
  });

  it("never schedules a review more than 180 days out", () => {
    let s = emptyConcept("x");
    for (let i = 0; i < 30; i++) s = applyAnswer(s, true, now);
    expect(s.intervalDays).toBe(180);
  });

  it("returns due concepts oldest first and weak concepts weakest first", () => {
    const a = { ...emptyConcept("a"), dueAt: "2026-10-10T00:00:00Z", mastery: 0.5, correct: 1 };
    const b = { ...emptyConcept("b"), dueAt: "2026-10-01T00:00:00Z", mastery: 0.2, incorrect: 1 };
    const c = { ...emptyConcept("c"), dueAt: "2026-11-01T00:00:00Z", mastery: 0.9, correct: 3 };
    expect(dueForReview([a, b, c], now).map((x) => x.conceptId)).toEqual(["b", "a"]);
    expect(needsRevision([a, b, c]).map((x) => x.conceptId)).toEqual(["b", "a"]);
  });
});

describe("concept prerequisites", () => {
  it("suggests correlation and concentration before diversification", () => {
    const gaps = unmetPrerequisites("diversification", {});
    expect(gaps).toContain("correlation");
    expect(gaps).toContain("concentration");
    expect(gaps).not.toContain("diversification");
    expect(gaps.indexOf("volatility-intro")).toBeLessThan(gaps.indexOf("correlation"));
  });

  it("skips prerequisites already mastered", () => {
    const gaps = unmetPrerequisites("diversification", { correlation: 0.9, concentration: 0.95, volatility: 0.9, "volatility-intro": 0.9, "percent-returns": 0.9 });
    expect(gaps).toEqual([]);
  });
});

describe("learning plan", () => {
  it("starts beginners at Module 1 and lists weak diagnostic topics in course order", () => {
    const plan = buildPlan({ experience: "none", focus: "both" }, { "compound-growth": 0, shares: 0, "percent-returns": 1 });
    expect(plan.stage).toBe("Foundations");
    expect(plan.moduleOrder[0]).toBe("m1");
    expect(plan.focusConcepts).toEqual(["compound-growth", "shares"]);
    expect(nextLesson(plan, [])).toBe("what-is-investing");
  });

  it("offers Module 1 as review when the core maths is known and the learner is confident", () => {
    const plan = buildPlan({ numeracyConfidence: 5 }, { "compound-growth": 1, "percent-returns": 1 });
    expect(plan.stage).toBe("Foundations review");
  });

  it("orders later modules by the learner's chosen focus", () => {
    expect(buildPlan({ focus: "companies" }, null).moduleOrder.slice(4, 6)).toEqual(["m5", "m8"]);
    expect(buildPlan({ focus: "long_term" }, null).moduleOrder[4]).toBe("m6");
  });

  it("moves to the next incomplete lesson and stops when everything available is done", () => {
    const plan = buildPlan({}, null);
    expect(nextLesson(plan, [{ lessonId: "what-is-investing", status: "completed", completedAt: null }])).toBe("saving-vs-investing");
    const all = getLesson("what-is-investing")!.module.lessons.map((l) => ({ lessonId: l.id, status: "completed" as const, completedAt: null }));
    expect(nextLesson(plan, all)).toBeNull();
  });
});
