import type { Concept } from "./schema";

// The concept map behind personalisation. Prerequisites point to concepts a learner
// should understand first; the planner walks this graph to suggest what to revisit.
const c = (id: string, title: string, moduleId: string, prerequisites: string[] = []): Concept => ({
  id, title, moduleId, prerequisites,
});

export const CONCEPTS: Concept[] = [
  // Module 1: money and investing
  c("investing-basics", "What investing is", "m1"),
  c("saving-vs-investing", "Saving versus investing", "m1", ["investing-basics"]),
  c("inflation", "Inflation and purchasing power", "m1", ["saving-vs-investing"]),
  c("percent-returns", "Returns and losses in percentages", "m1"),
  c("compound-growth", "Compound growth", "m1", ["percent-returns"]),
  c("simple-vs-compound", "Simple versus compound returns", "m1", ["compound-growth"]),
  c("time-in-market", "Why time in the market matters", "m1", ["compound-growth", "volatility-intro"]),
  c("volatility-intro", "Prices go up and down", "m1", ["percent-returns"]),
  c("returns-uncertain", "Why returns aren't guaranteed", "m1", ["volatility-intro"]),
  // Module 2: how the stock market works
  c("shares", "What a share represents", "m2", ["investing-basics"]),
  c("why-companies-issue", "Why companies issue shares", "m2", ["shares"]),
  c("exchanges", "How stock exchanges work", "m2", ["shares"]),
  c("supply-demand", "Buyers, sellers, supply and demand", "m2", ["exchanges"]),
  c("market-cap", "Market capitalisation", "m2", ["shares", "percent-returns"]),
  c("price-vs-value", "Share price versus company value", "m2", ["market-cap"]),
  c("order-types", "Market and limit orders", "m2", ["exchanges"]),
  c("bid-ask", "Bid-ask spreads", "m2", ["order-types"]),
  // Module 3: types of investments
  c("bonds", "Bonds and government bonds", "m3", ["investing-basics", "percent-returns"]),
  c("index-funds", "Index funds", "m3", ["shares"]),
  c("etfs", "ETFs", "m3", ["index-funds", "exchanges"]),
  c("mutual-funds", "Mutual funds", "m3", ["index-funds"]),
  c("cash-and-mmf", "Cash and money market funds", "m3", ["inflation"]),
  c("speculation", "Investing versus speculative trading", "m3", ["returns-uncertain"]),
  // Module 4: risk
  c("volatility", "Volatility versus permanent loss", "m4", ["volatility-intro"]),
  c("correlation", "Correlation between investments", "m4", ["volatility"]),
  c("concentration", "Concentration risk", "m4", ["percent-returns"]),
  c("diversification", "Diversification", "m4", ["correlation", "concentration"]),
  c("company-risk", "Company-specific risk", "m4", ["shares", "concentration"]),
  c("market-risk", "Market-wide risk", "m4", ["diversification"]),
  c("currency-risk", "Currency risk", "m4", ["percent-returns"]),
  c("liquidity-risk", "Liquidity risk", "m4", ["supply-demand"]),
  c("leverage", "Leverage and margin", "m4", ["percent-returns", "volatility"]),
  c("past-performance", "Past performance and future returns", "m4", ["returns-uncertain"]),
  c("horizon-risk", "How time horizon changes risk", "m4", ["time-in-market", "volatility"]),
];

export const CONCEPT_BY_ID = new Map(CONCEPTS.map((x) => [x.id, x]));
