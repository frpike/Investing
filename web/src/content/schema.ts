import { z } from "zod";

// Course content is plain data checked by these schemas (see content.test.ts),
// so new lessons and modules are added as files, not code.

export const OptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Shown when this option is picked, explaining why it is right or wrong. */
  feedback: z.string().min(1),
});

export const QuestionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  conceptId: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(OptionSchema).min(2).max(5),
  correctOptionId: z.string().min(1),
  /** One or two sentences on the reasoning, shown after answering. */
  explanation: z.string().min(1),
});

const TextBlock = z.object({ type: z.literal("text"), body: z.array(z.string().min(1)).min(1) });
const AnalogyBlock = z.object({ type: z.literal("analogy"), title: z.string(), body: z.string() });
const KeyTermBlock = z.object({ type: z.literal("keyTerm"), term: z.string(), definition: z.string() });
const CalloutBlock = z.object({
  type: z.literal("callout"),
  tone: z.enum(["risk", "note", "history"]),
  title: z.string(),
  body: z.string(),
  /** Required for history callouts: where the figure comes from and when. */
  source: z.string().optional(),
});
const WorkedExampleBlock = z.object({
  type: z.literal("workedExample"),
  title: z.string(),
  setup: z.string(),
  steps: z.array(z.object({ label: z.string(), working: z.string() })).min(1),
  result: z.string(),
});
export const ExerciseKind = z.enum(["compound", "inflation", "simpleVsCompound", "percentChange", "timeInMarket"]);
const ExerciseBlock = z.object({
  type: z.literal("exercise"),
  kind: ExerciseKind,
  title: z.string(),
  prompt: z.string(),
  /** A question to think about while playing with the numbers. */
  reflect: z.string(),
});
const CheckBlock = z.object({ type: z.literal("check"), question: QuestionSchema });

export const BlockSchema = z.discriminatedUnion("type", [
  TextBlock, AnalogyBlock, KeyTermBlock, CalloutBlock, WorkedExampleBlock, ExerciseBlock, CheckBlock,
]);

export const LessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  minutes: z.number().int().min(1).max(30),
  conceptIds: z.array(z.string()).min(1),
  blocks: z.array(BlockSchema).min(3),
  practical: z.object({ title: z.string(), steps: z.array(z.string()).min(1) }),
  takeaways: z.array(z.string()).min(2).max(6),
  quiz: z.array(QuestionSchema).min(2),
});

export const ModuleSchema = z.object({
  id: z.string().regex(/^m\d+$/),
  position: z.number().int().min(1),
  title: z.string(),
  summary: z.string(),
  intro: z.array(z.string()).min(1),
  status: z.enum(["available", "coming_soon"]),
  lessons: z.array(LessonSchema),
  /** Lesson titles for modules whose content isn't written yet. */
  outline: z.array(z.string()).default([]),
});

export const ConceptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  moduleId: z.string(),
  prerequisites: z.array(z.string()),
});

export type Question = z.infer<typeof QuestionSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type Module = z.infer<typeof ModuleSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type ExerciseKindT = z.infer<typeof ExerciseKind>;
