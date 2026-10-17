import type { Question } from "./schema";

// One question per diagnostic topic. Every question has an "I'm not sure" option, so
// beginners aren't pushed into guessing; that answer counts as not yet known.
export const NOT_SURE = "unsure";

const unsure = { id: NOT_SURE, text: "I'm not sure yet", feedback: "That's fine. We'll cover this." };

export const DIAGNOSTIC: (Question & { topic: string })[] = [
  {
    id: "diag-shares", topic: "Shares and ownership", conceptId: "shares",
    prompt: "What do you own when you buy a share in a company?",
    options: [
      { id: "a", text: "A small part of the company", feedback: "Right: a share is a slice of ownership." },
      { id: "b", text: "A loan to the company that it must repay", feedback: "That describes a bond, not a share." },
      { id: "c", text: "A voucher to spend on its products", feedback: "No. A share is ownership, not credit." },
      unsure,
    ],
    correctOptionId: "a",
    explanation: "A share is a small piece of ownership in a company.",
  },
  {
    id: "diag-bonds", topic: "Stocks versus bonds", conceptId: "bonds",
    prompt: "Which statement about bonds is usually true?",
    options: [
      { id: "a", text: "A bond is a loan that pays interest and is usually less volatile than shares", feedback: "Correct." },
      { id: "b", text: "Bonds give you ownership of a company", feedback: "That's shares. A bond is a loan." },
      { id: "c", text: "Bonds can never lose value", feedback: "Bond prices can fall, for example when interest rates rise or the borrower struggles." },
      unsure,
    ],
    correctOptionId: "a",
    explanation: "Bonds are loans; they pay interest and are usually, though not always, steadier than shares.",
  },
  {
    id: "diag-index", topic: "Index funds and ETFs", conceptId: "index-funds",
    prompt: "What does an index fund do?",
    options: [
      { id: "a", text: "Tries to pick only the best-performing companies", feedback: "That's an actively managed fund." },
      { id: "b", text: "Buys all (or a representative sample of) the companies in a list such as the FTSE 100", feedback: "Correct." },
      { id: "c", text: "Guarantees a fixed return", feedback: "No fund can guarantee returns from shares." },
      unsure,
    ],
    correctOptionId: "b",
    explanation: "An index fund tracks a market index instead of picking winners.",
  },
  {
    id: "diag-returns", topic: "Returns and losses", conceptId: "percent-returns",
    prompt: "An investment falls 50%. What rise brings it back to where it started?",
    options: [
      { id: "a", text: "50%", feedback: "Half of £100 is £50; a 50% rise on £50 is only £75." },
      { id: "b", text: "100%", feedback: "Correct. The remaining half must double." },
      { id: "c", text: "25%", feedback: "Not enough. The remaining half must double." },
      unsure,
    ],
    correctOptionId: "b",
    explanation: "After halving, value must double (+100%) to recover.",
  },
  {
    id: "diag-diversification", topic: "Diversification", conceptId: "diversification",
    prompt: "Why do investors spread money across many investments?",
    options: [
      { id: "a", text: "To make sure they can't lose money", feedback: "Diversification reduces risk but can't remove it." },
      { id: "b", text: "So one company doing badly hurts less", feedback: "Correct." },
      { id: "c", text: "Because it always increases returns", feedback: "It mainly reduces risk; it doesn't guarantee higher returns." },
      unsure,
    ],
    correctOptionId: "b",
    explanation: "Diversification limits the damage any single investment can do.",
  },
  {
    id: "diag-volatility", topic: "Risk and volatility", conceptId: "volatility",
    prompt: "Your fund falls 20% in a month but you haven't sold. Which is most accurate?",
    options: [
      { id: "a", text: "You've permanently lost 20%", feedback: "It's an unrealised loss; it may or may not recover." },
      { id: "b", text: "It's a fall in value that isn't locked in unless you sell or it never recovers", feedback: "Correct." },
      { id: "c", text: "Nothing has changed", feedback: "The value really is lower right now." },
      unsure,
    ],
    correctOptionId: "b",
    explanation: "Volatility becomes permanent loss only through selling or a lasting decline.",
  },
  {
    id: "diag-compound", topic: "Inflation and compound growth", conceptId: "compound-growth",
    prompt: "£1,000 grows 10% a year for two years with nothing added. What is it worth?",
    options: [
      { id: "a", text: "£1,200", feedback: "That's simple growth. Year two's 10% applies to £1,100." },
      { id: "b", text: "£1,210", feedback: "Correct: £1,000 × 1.1 × 1.1." },
      { id: "c", text: "£1,100", feedback: "That's just one year." },
      unsure,
    ],
    correctOptionId: "b",
    explanation: "Compounding: growth applies to the new total each year.",
  },
];
