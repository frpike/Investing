import { CONCEPT_BY_ID } from "@/content/concepts";
import { MASTERED } from "./mastery";

/**
 * Prerequisites of a concept that the learner hasn't mastered, deepest first, so they can be
 * revisited in a sensible order. Example: struggling with diversification surfaces correlation
 * and concentration (and their own gaps) before diversification itself.
 */
export function unmetPrerequisites(conceptId: string, mastery: Record<string, number>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const p of CONCEPT_BY_ID.get(id)?.prerequisites ?? []) visit(p);
    if (id !== conceptId && (mastery[id] ?? 0) < MASTERED) out.push(id);
  };
  visit(conceptId);
  return out;
}
