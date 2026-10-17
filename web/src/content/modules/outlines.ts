import type { Module } from "../schema";

// Modules whose structure is planned but whose lessons are not written yet.
// They appear in the catalogue as "coming soon" so learners can see the whole path.
const outline = (position: number, title: string, summary: string, lessons: string[]): Module => ({
  id: `m${position}`,
  position,
  title,
  summary,
  intro: [summary],
  status: "coming_soon",
  lessons: [],
  outline: lessons,
});

export const OUTLINE_MODULES: Module[] = [
  outline(2, "How the stock market works", "What a share really is, how exchanges match buyers and sellers, and why prices move during the day.", [
    "What a share represents", "Why companies issue shares", "How stock exchanges work", "Buyers, sellers, supply and demand",
    "Market capitalisation", "Share price versus company value", "Market orders, limit orders and spreads", "Why prices change during the day",
  ]),
  outline(3, "Different types of investments", "Shares, bonds, funds, ETFs, cash and more: what each is, and which carry extra complexity or risk.", [
    "Individual shares", "Bonds and government bonds", "ETFs", "Index funds", "Mutual funds", "Money market funds",
    "Cash and interest-bearing accounts", "Commodities and property exposure", "Investing versus speculative trading",
  ]),
  outline(4, "Understanding risk", "Volatility, diversification, concentration, currency and leverage, and how your time horizon changes all of them.", [
    "Volatility versus permanent loss", "Diversification", "Correlation", "Concentration risk", "Company-specific and market-wide risk",
    "Currency risk", "Liquidity risk", "Leverage and margin", "Past performance and future returns", "Time horizons and risk",
  ]),
  outline(5, "How to evaluate a company", "Reading the numbers behind a business, and the limits of each metric.", [
    "Revenue and growth", "Profit: gross, operating and net", "Cash flow", "Assets, liabilities and debt", "Earnings per share",
    "Price-to-earnings and price-to-sales", "Dividends and yield", "Competitive advantage", "Management and strategy", "Valuation versus quality",
  ]),
  outline(6, "ETFs and building a diversified portfolio", "How index funds work, what you actually own, and how a portfolio fits together.", [
    "What an index is", "How index funds work", "S&P 500 versus global indices", "Market-cap weighting", "Fees and expense ratios",
    "Overlap between ETFs", "Geographic and sector exposure", "Bonds in a portfolio", "Rebalancing", "Why diversification doesn't remove risk",
  ]),
  outline(7, "Practical investing", "Orders, fees, statements and UK tax wrappers, explained using Trading 212's features.", [
    "Placing and reviewing an order", "Market versus limit orders", "Bid and ask", "Fees and FX costs", "Dividends and reinvestment",
    "Reading a portfolio statement", "Realised versus unrealised gains", "Tax-efficient investing in the UK", "Stocks and Shares ISAs",
    "Invest account versus ISA", "Broker features and limits",
  ]),
  outline(8, "Developing an investment thesis", "Researching a company, separating facts from opinions, and knowing what would prove you wrong.", [
    "Researching a company", "Reliable sources", "Facts versus opinions", "Assessing prospects", "Expectations and valuation",
    "Bull and bear cases", "What would prove you wrong", "Understanding uncertainty", "Cognitive biases",
  ]),
  outline(9, "Behaviour and psychology", "The mental traps that cost investors the most, and how to build habits that avoid them.", [
    "Fear of missing out", "Panic selling", "Overconfidence", "Confirmation bias", "Herd behaviour", "Chasing recent winners",
    "Checking prices too often", "A consistent decision process",
  ]),
  outline(10, "Independent investing", "Writing your own investment policy, reviewing it, and knowing when professional advice helps.", [
    "Your investment policy statement", "Defining financial goals", "Risk capacity versus risk tolerance", "Review schedules",
    "Comparing investment approaches", "Evaluating costs", "When professional advice may help",
  ]),
];
