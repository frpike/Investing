import type { Module } from "../schema";

export const module1: Module = {
  id: "m1",
  position: 1,
  title: "Understanding money and investing",
  summary: "What investing is, how it differs from saving, and the two forces that shape every long-term plan: inflation and compounding.",
  intro: [
    "Before shares, funds or apps, there are a few ideas that explain why people invest at all. This module builds them from scratch.",
    "You'll do some simple maths along the way. Every calculation is shown step by step, and the calculators let you try your own numbers.",
  ],
  status: "available",
  outline: [],
  lessons: [
    {
      id: "what-is-investing",
      title: "What investing is, and why people do it",
      minutes: 6,
      conceptIds: ["investing-basics"],
      blocks: [
        {
          type: "text",
          body: [
            "Investing means using money today to buy something you expect to be worth more, or to pay you an income, in the future.",
            "That 'something' might be a small slice of a business (a **share**), a loan to a government or company that pays interest (a **bond**), or a fund that holds hundreds of these at once.",
            "In return for the chance of growth, you accept two things: you can't spend that money now, and the outcome is uncertain. Investing is a trade between today and the future, made without knowing exactly how it turns out.",
          ],
        },
        {
          type: "analogy",
          title: "Fruit in the fridge, or a tree in the garden",
          body: "Keeping fruit in the fridge means you know exactly what you have, but it slowly goes off. Planting a tree takes years, a storm might damage it, and some years it fruits badly. Over a long time, though, a healthy tree can give you far more fruit than you planted. Investing is planting trees. Saving is the fridge. Most people sensibly do both.",
        },
        {
          type: "keyTerm",
          term: "Return",
          definition: "What you get back compared with what you put in. Usually shown as a percentage: the gain (or loss) divided by the amount you started with.",
        },
        {
          type: "workedExample",
          title: "Working out a return",
          setup: "You invest £100. A year later it is worth £106.",
          steps: [
            { label: "Find the gain", working: "£106 − £100 = £6" },
            { label: "Divide by what you started with", working: "£6 ÷ £100 = 0.06" },
            { label: "Turn it into a percentage", working: "0.06 × 100 = 6%" },
          ],
          result: "Your return for the year was 6%. If it had fallen to £94, the same steps give −6%.",
        },
        {
          type: "callout",
          tone: "risk",
          title: "Expected is not the same as guaranteed",
          body: "When people say shares have 'returned about 7% a year', they mean on average, over long periods, in the past. Individual years can be much better or much worse, and the future can differ from the past. You can lose money investing.",
        },
        {
          type: "check",
          question: {
            id: "m1l1-check",
            conceptId: "investing-basics",
            prompt: "What do you give up when you invest money rather than keep it as cash?",
            options: [
              { id: "a", text: "Nothing, as long as you pick good investments", feedback: "Even good investments can fall in value for a while, and you can't spend the money while it's invested." },
              { id: "b", text: "Being able to spend it now, and certainty about what it will be worth", feedback: "Right. That's the trade: access and certainty today for the chance of growth later." },
              { id: "c", text: "The right to take it out ever again", feedback: "You can usually sell investments, but you may have to sell at a bad moment, for less than you paid." },
            ],
            correctOptionId: "b",
            explanation: "Investing swaps access and certainty now for the chance, not the promise, of more later.",
          },
        },
      ],
      practical: {
        title: "Write down one goal",
        steps: [
          "Write one thing you'd like your money to do, such as 'a house deposit' or 'more freedom at 60'.",
          "Next to it, write roughly when you'd need the money.",
          "Keep it somewhere you'll see it. You'll use it in lesson 2.",
        ],
      },
      takeaways: [
        "Investing means buying assets you expect to grow or pay income over time.",
        "You trade access and certainty today for the chance of more later.",
        "A return is the gain or loss divided by what you started with.",
        "Average past returns are not a promise; losses are possible.",
      ],
      quiz: [
        {
          id: "m1l1-q1",
          conceptId: "percent-returns",
          prompt: "You invest £200 and it grows to £230. What is your return?",
          options: [
            { id: "a", text: "30%", feedback: "That's the gain in pounds (£30) read as a percentage. Divide by the £200 you started with." },
            { id: "b", text: "15%", feedback: "Correct: £30 ÷ £200 = 0.15, which is 15%." },
            { id: "c", text: "13%", feedback: "That divides £30 by £230. Returns are measured against what you started with." },
          ],
          correctOptionId: "b",
          explanation: "Return = gain ÷ starting amount = £30 ÷ £200 = 15%.",
        },
        {
          id: "m1l1-q2",
          conceptId: "investing-basics",
          prompt: "Which of these is an investment rather than spending?",
          options: [
            { id: "a", text: "Buying a share in a company", feedback: "Yes. You own a slice of a business that you hope grows or pays you dividends." },
            { id: "b", text: "Buying a new phone", feedback: "A phone loses value as you use it. That's spending, even if it's useful." },
            { id: "c", text: "Paying a monthly streaming subscription", feedback: "That's paying for a service you use now." },
          ],
          correctOptionId: "a",
          explanation: "An investment is something bought for its expected future value or income.",
        },
        {
          id: "m1l1-q3",
          conceptId: "investing-basics",
          prompt: "Someone says a fund 'returned 7% a year over the last 30 years'. What can you safely conclude?",
          options: [
            { id: "a", text: "It will return about 7% next year", feedback: "Single years vary a lot. Some years were probably well above 7% and some were losses." },
            { id: "b", text: "It averaged about 7% a year in the past, with ups and downs along the way", feedback: "Exactly. It describes the past on average, not a promise about next year." },
            { id: "c", text: "You can't lose money in it", feedback: "Any investment that can rise can also fall." },
          ],
          correctOptionId: "b",
          explanation: "Long-run averages describe history and hide big year-to-year swings.",
        },
      ],
    },
    {
      id: "saving-vs-investing",
      title: "Saving versus investing",
      minutes: 7,
      conceptIds: ["saving-vs-investing"],
      blocks: [
        {
          type: "text",
          body: [
            "**Saving** usually means keeping money in a bank or building society account. The number of pounds doesn't fall, you can usually get it back quickly, and you earn interest.",
            "**Investing** means buying assets whose value moves. Over long periods, investing has historically grown money faster than savings accounts, but in any single year it can fall, sometimes by a lot.",
            "They do different jobs. Savings are for money you might need soon or can't afford to see fall. Investments are for money you can leave alone for years.",
          ],
        },
        {
          type: "analogy",
          title: "A lift and a staircase in an earthquake zone",
          body: "Savings are like a lift that moves you up slowly and smoothly. Investing is like a staircase that climbs faster overall, but the ground sometimes shakes and throws you down a few floors. If you need to be on a particular floor next week, take the lift. If you have years, the stairs have usually got people higher.",
        },
        {
          type: "workedExample",
          title: "One year, two choices (hypothetical numbers)",
          setup: "You have £1,000. A savings account pays 4% a year. An investment fund might return anything from −15% to +15% in a single year.",
          steps: [
            { label: "Savings after one year", working: "£1,000 × 1.04 = £1,040" },
            { label: "Investment in a good year (+15%)", working: "£1,000 × 1.15 = £1,150" },
            { label: "Investment in a bad year (−15%)", working: "£1,000 × 0.85 = £850" },
          ],
          result: "Over one year the investment is a gamble on which kind of year you get. Over many years the good and bad years tend to blend, which is why time horizon matters so much.",
        },
        {
          type: "callout",
          tone: "note",
          title: "A common order of priorities",
          body: "Many people first clear expensive debt such as credit cards, then build an emergency fund of a few months' essential spending in savings, and only then invest money they won't need for at least five years. This is a common guideline, not personal advice. Your situation decides what's right for you.",
        },
        {
          type: "keyTerm",
          term: "Emergency fund",
          definition: "Cash kept in easy-access savings for unexpected costs, such as a broken boiler or a gap between jobs, so you're never forced to sell investments at a bad time.",
        },
        {
          type: "check",
          question: {
            id: "m1l2-check",
            conceptId: "saving-vs-investing",
            prompt: "You're saving for a holiday in eight months. Where does that money usually belong?",
            options: [
              { id: "a", text: "In shares, because they grow faster", feedback: "Over eight months shares could easily be down 10–20% when you need the money." },
              { id: "b", text: "In savings, because you need it soon and can't afford a fall", feedback: "Right. Short-term money needs certainty more than growth." },
            ],
            correctOptionId: "b",
            explanation: "The shorter the time until you need money, the less room there is to recover from a fall.",
          },
        },
      ],
      practical: {
        title: "Sort your money into jobs",
        steps: [
          "Look at the goal you wrote in lesson 1. Is it more or less than five years away?",
          "If less, that money probably belongs in savings. If more, it could be invested.",
          "Check whether you have an emergency fund. If not, consider building one before investing.",
        ],
      },
      takeaways: [
        "Savings protect the number of pounds; investments aim to grow it but can fall.",
        "Short-term money (under about five years) usually suits savings.",
        "An emergency fund stops you being forced to sell investments at a bad time.",
      ],
      quiz: [
        {
          id: "m1l2-q1",
          conceptId: "saving-vs-investing",
          prompt: "What is the main advantage of a savings account over investing?",
          options: [
            { id: "a", text: "Higher long-term growth", feedback: "Historically, investing has usually grown faster over long periods. Savings win on certainty, not growth." },
            { id: "b", text: "The number of pounds doesn't fall", feedback: "Correct. Your balance stays put and earns interest (though inflation can still erode what it buys)." },
            { id: "c", text: "It's free from inflation", feedback: "Inflation affects savings too. That's the next lesson." },
          ],
          correctOptionId: "b",
          explanation: "Savings give certainty in pounds; investments give the chance of more growth with the risk of falls.",
        },
        {
          id: "m1l2-q2",
          conceptId: "saving-vs-investing",
          prompt: "Why does an emergency fund matter for an investor?",
          options: [
            { id: "a", text: "It earns more than investments", feedback: "It usually earns less. Its value is that it's there when you need it." },
            { id: "b", text: "It means you won't have to sell investments at a bad time to cover a surprise bill", feedback: "Exactly. It protects your investments from being sold in a downturn." },
            { id: "c", text: "Banks require it before you can invest", feedback: "No such rule. It's about protecting yourself." },
          ],
          correctOptionId: "b",
          explanation: "Without cash for emergencies, a surprise cost could force you to sell when prices are down.",
        },
        {
          id: "m1l2-q3",
          conceptId: "saving-vs-investing",
          prompt: "£1,000 is invested and falls 15% in the first year. How much is it worth?",
          options: [
            { id: "a", text: "£985", feedback: "That takes off £15, not 15%. 15% of £1,000 is £150." },
            { id: "b", text: "£850", feedback: "Correct: £1,000 × 0.85 = £850." },
            { id: "c", text: "£870", feedback: "Check the maths: 15% of £1,000 is £150." },
          ],
          correctOptionId: "b",
          explanation: "A 15% fall multiplies the value by 0.85.",
        },
      ],
    },
    {
      id: "inflation",
      title: "Inflation and purchasing power",
      minutes: 7,
      conceptIds: ["inflation"],
      blocks: [
        {
          type: "text",
          body: [
            "**Inflation** is the general rise in prices over time. When inflation is 3%, a basket of shopping that cost £100 last year costs about £103 now.",
            "That means the same £100 in cash buys a little less each year. What matters isn't how many pounds you have, but what those pounds can buy: your **purchasing power**.",
            "This is why 'safe' cash isn't completely safe. If your savings earn less interest than the rate of inflation, you're slowly getting poorer in real terms, even though your balance goes up.",
          ],
        },
        {
          type: "workedExample",
          title: "What £100 buys after a year of 3% inflation",
          setup: "Prices rise 3% over the year. Your £100 sits in a jar earning nothing.",
          steps: [
            { label: "Last year's £100 basket now costs", working: "£100 × 1.03 = £103" },
            { label: "Share of the basket your £100 can buy", working: "£100 ÷ £103 = 0.971, so about 97%" },
          ],
          result: "Your £100 lost about 3% of its purchasing power in one year without a single pound disappearing.",
        },
        {
          type: "keyTerm",
          term: "Real return",
          definition: "Your return after taking inflation into account. Roughly, the return minus inflation. Precisely, (1 + return) ÷ (1 + inflation) − 1.",
        },
        {
          type: "workedExample",
          title: "Savings interest versus inflation",
          setup: "Your savings pay 4% interest. Inflation is 3%.",
          steps: [
            { label: "Quick estimate", working: "4% − 3% ≈ 1% real return" },
            { label: "Precise", working: "1.04 ÷ 1.03 − 1 = 0.0097, so about 0.97%" },
          ],
          result: "Your spending power grew by just under 1%. If inflation had been 5%, your real return would be about −1%, even though your balance went up.",
        },
        {
          type: "callout",
          tone: "history",
          title: "Inflation can surprise everyone",
          body: "UK consumer price inflation (CPI) reached 11.1% in the year to October 2022, the highest rate in over 40 years. Many savings accounts paid far less than that at the time, so savers lost purchasing power quickly.",
          source: "Office for National Statistics, CPI annual rate, October 2022.",
        },
        {
          type: "exercise",
          kind: "inflation",
          title: "Try it: what will your money buy?",
          prompt: "Pick an amount, an inflation rate and a number of years.",
          reflect: "At 3% inflation, roughly how many years does it take for prices to double? (Hint: it's the rule of 72 from the next lesson.)",
        },
      ],
      practical: {
        title: "Check your own savings rate",
        steps: [
          "Find the interest rate on your main savings account.",
          "Look up the latest UK CPI inflation figure on the ONS website.",
          "Work out your rough real return: savings rate minus inflation.",
        ],
      },
      takeaways: [
        "Inflation means each pound buys less over time.",
        "What matters is purchasing power, not the number of pounds.",
        "Real return ≈ return minus inflation; it can be negative even when your balance grows.",
      ],
      quiz: [
        {
          id: "m1l3-q1",
          conceptId: "inflation",
          prompt: "Your savings earn 2% and inflation is 4%. What happens to your purchasing power?",
          options: [
            { id: "a", text: "It grows by 2%", feedback: "Your balance grows 2%, but prices grow faster." },
            { id: "b", text: "It falls by roughly 2%", feedback: "Correct. 2% − 4% ≈ −2% real return." },
            { id: "c", text: "It stays the same", feedback: "Only if interest exactly matched inflation." },
          ],
          correctOptionId: "b",
          explanation: "Real return ≈ 2% − 4% = −2%: you can buy about 2% less than a year ago.",
        },
        {
          id: "m1l3-q2",
          conceptId: "inflation",
          prompt: "Why is keeping all your long-term money in cash a risk, even though the balance never falls?",
          options: [
            { id: "a", text: "Banks can take it", feedback: "UK deposits have protection up to a limit through the FSCS. The quieter risk is inflation." },
            { id: "b", text: "Inflation can erode what it buys over many years", feedback: "Right. Over decades, even modest inflation makes a big difference." },
            { id: "c", text: "Cash pays tax every day", feedback: "Not the issue. Inflation is." },
          ],
          correctOptionId: "b",
          explanation: "Cash protects pounds, not purchasing power.",
        },
        {
          id: "m1l3-q3",
          conceptId: "inflation",
          prompt: "Prices rise 10% in a year. Roughly how much of last year's shopping can £110 buy now?",
          options: [
            { id: "a", text: "Exactly the same amount as £100 bought last year", feedback: "Correct. £100 × 1.10 = £110, so £110 buys last year's £100 basket." },
            { id: "b", text: "10% more", feedback: "The extra £10 is used up by higher prices." },
            { id: "c", text: "10% less", feedback: "That would be true for £100, not £110." },
          ],
          correctOptionId: "a",
          explanation: "With 10% inflation you need 10% more pounds to buy the same things.",
        },
      ],
    },
    {
      id: "compound-growth",
      title: "Compound growth",
      minutes: 8,
      conceptIds: ["compound-growth", "percent-returns"],
      blocks: [
        {
          type: "text",
          body: [
            "**Compounding** happens when the growth you earn starts earning growth of its own.",
            "If £1,000 grows 5%, you have £1,050. Next year the 5% applies to £1,050, not £1,000, so you gain £52.50 instead of £50. The gains snowball.",
            "Compounding is slow at first and dramatic later, which is why starting early matters more than most people expect.",
          ],
        },
        {
          type: "workedExample",
          title: "£1,000 growing at 5% a year",
          setup: "No money added or taken out. Growth of 5% each year (a steady number used for illustration; real returns vary).",
          steps: [
            { label: "Year 1", working: "£1,000 × 1.05 = £1,050.00" },
            { label: "Year 2", working: "£1,050 × 1.05 = £1,102.50" },
            { label: "Year 3", working: "£1,102.50 × 1.05 = £1,157.63" },
            { label: "Shortcut for any year", working: "Value = starting amount × (1 + rate)^years, e.g. £1,000 × 1.05^20 = £2,653.30" },
          ],
          result: "After 20 years the money has more than doubled, and £1,653.30 of it is growth on growth and growth on the original.",
        },
        {
          type: "keyTerm",
          term: "Rule of 72",
          definition: "A quick way to estimate doubling time: divide 72 by the yearly percentage. At 6% a year, money doubles in about 72 ÷ 6 = 12 years.",
        },
        {
          type: "analogy",
          title: "A snowball rolling downhill",
          body: "A small snowball picks up a little snow at first. As it grows, each roll picks up more, because there's more surface to stick to. The hill is time, and the snow is returns.",
        },
        {
          type: "callout",
          tone: "risk",
          title: "Compounding works on losses too",
          body: "If your investment falls 20% one year, the next year's growth starts from a smaller base. Fees compound too: a 1% yearly fee quietly takes a growing slice of a growing pot.",
        },
        {
          type: "exercise",
          kind: "compound",
          title: "Try it: watch a snowball grow",
          prompt: "Change the starting amount, the regular monthly addition, the yearly rate and the number of years.",
          reflect: "Compare 20 years with 30 years at the same rate. Why is the extra 10 years worth more than the first 10?",
        },
      ],
      practical: {
        title: "Estimate a doubling time",
        steps: [
          "Pick a growth rate you've heard quoted, such as 4% or 7%.",
          "Use the rule of 72 to estimate how long money would take to double at that rate.",
          "Check it in the calculator above. How close was the rule?",
        ],
      },
      takeaways: [
        "Compounding means earning growth on previous growth.",
        "Value after n years = start × (1 + rate)^n when nothing is added or removed.",
        "The rule of 72 estimates doubling time: 72 ÷ yearly %.",
        "Losses and fees compound too.",
      ],
      quiz: [
        {
          id: "m1l4-q1",
          conceptId: "compound-growth",
          prompt: "£500 grows at 10% a year for two years. What is it worth?",
          options: [
            { id: "a", text: "£600", feedback: "That's simple growth: £50 twice. The second year's 10% applies to £550." },
            { id: "b", text: "£605", feedback: "Correct: £500 × 1.10 = £550, then £550 × 1.10 = £605." },
            { id: "c", text: "£610", feedback: "Close, but check the second year: 10% of £550 is £55." },
          ],
          correctOptionId: "b",
          explanation: "Each year's growth applies to the new, larger amount.",
        },
        {
          id: "m1l4-q2",
          conceptId: "compound-growth",
          prompt: "Using the rule of 72, roughly how long does money take to double at 8% a year?",
          options: [
            { id: "a", text: "About 6 years", feedback: "72 ÷ 8 = 9, not 6." },
            { id: "b", text: "About 9 years", feedback: "Correct: 72 ÷ 8 = 9." },
            { id: "c", text: "About 12.5 years", feedback: "That's dividing 100 by 8. The rule uses 72." },
          ],
          correctOptionId: "b",
          explanation: "Doubling time ≈ 72 ÷ yearly percentage.",
        },
        {
          id: "m1l4-q3",
          conceptId: "compound-growth",
          prompt: "Why does starting to invest earlier often matter more than investing larger amounts later?",
          options: [
            { id: "a", text: "Because early money gets more years of compounding", feedback: "Right. The growth on growth needs time, and early money has the most of it." },
            { id: "b", text: "Because markets always rise over time", feedback: "Markets have often risen over long periods, but not always, and not reliably over shorter ones." },
            { id: "c", text: "Because fees are lower for young people", feedback: "Fees don't depend on age." },
          ],
          correctOptionId: "a",
          explanation: "Compounding rewards time; each extra year multiplies everything that came before.",
        },
      ],
    },
    {
      id: "simple-vs-compound",
      title: "Simple versus compound returns, and why percentages don't add up",
      minutes: 7,
      conceptIds: ["simple-vs-compound", "percent-returns"],
      blocks: [
        {
          type: "text",
          body: [
            "With **simple** interest, you earn the same amount every year, based only on what you started with. With **compound** returns, each year's growth is based on the new total.",
            "The gap is small at first and huge later. It's the difference between a straight line and a curve that bends upwards.",
            "Percentages have another trap: a fall and a rise of the same size don't cancel out.",
          ],
        },
        {
          type: "workedExample",
          title: "20 years at 5%: simple versus compound",
          setup: "£1,000, 5% a year, 20 years.",
          steps: [
            { label: "Simple: same £50 every year", working: "£1,000 + (20 × £50) = £2,000" },
            { label: "Compound: growth on growth", working: "£1,000 × 1.05^20 = £2,653.30" },
            { label: "Difference", working: "£2,653.30 − £2,000 = £653.30" },
          ],
          result: "Compounding added £653.30 that simple interest never would.",
        },
        {
          type: "workedExample",
          title: "Down 20%, then up 20%: are you back to even?",
          setup: "You invest £100. It falls 20%, then rises 20%.",
          steps: [
            { label: "After the fall", working: "£100 × 0.80 = £80" },
            { label: "After the rise", working: "£80 × 1.20 = £96" },
          ],
          result: "You're down £4. The 20% rise was on a smaller amount. After a 50% fall you need a 100% rise just to get back to where you started.",
        },
        {
          type: "exercise",
          kind: "percentChange",
          title: "Try it: how big a rise undoes a fall?",
          prompt: "Pick a percentage fall and see the rise needed to recover.",
          reflect: "Why does avoiding a very large loss matter so much for long-term growth?",
        },
        {
          type: "exercise",
          kind: "simpleVsCompound",
          title: "Try it: line versus curve",
          prompt: "Compare simple and compound growth over different periods.",
          reflect: "At what point does the compound line clearly pull away from the simple line?",
        },
      ],
      practical: {
        title: "Spot the trap in the wild",
        steps: [
          "Next time you see a headline like 'shares bounce back 10% after 10% fall', work out whether they're really back to even.",
          "Use: value × (1 − fall) × (1 + rise).",
        ],
      },
      takeaways: [
        "Simple interest grows in a straight line; compound returns grow in a curve.",
        "A fall followed by an equal percentage rise leaves you below where you started.",
        "Recovering from a loss of L% needs a rise of L ÷ (100 − L) × 100%.",
      ],
      quiz: [
        {
          id: "m1l5-q1",
          conceptId: "percent-returns",
          prompt: "An investment falls 50%. What rise does it need to get back to its starting value?",
          options: [
            { id: "a", text: "50%", feedback: "A 50% rise on half your money only gets you to 75%." },
            { id: "b", text: "100%", feedback: "Correct. Half of the money has to double." },
            { id: "c", text: "75%", feedback: "Try it with £100: down 50% is £50, and £50 needs to double." },
          ],
          correctOptionId: "b",
          explanation: "After a 50% fall you have half; it must double (+100%) to recover.",
        },
        {
          id: "m1l5-q2",
          conceptId: "simple-vs-compound",
          prompt: "Which grows faster over 30 years at the same 5% rate?",
          options: [
            { id: "a", text: "Simple interest", feedback: "Simple interest gives the same £ amount each year." },
            { id: "b", text: "Compound growth", feedback: "Right. Each year's growth adds to the base for the next." },
            { id: "c", text: "They end up the same", feedback: "Only for the very first year." },
          ],
          correctOptionId: "b",
          explanation: "Compounding pulls further ahead every year.",
        },
        {
          id: "m1l5-q3",
          conceptId: "percent-returns",
          prompt: "£200 rises 10% then falls 10%. What is it worth?",
          options: [
            { id: "a", text: "£200", feedback: "The fall is 10% of £220, which is £22." },
            { id: "b", text: "£198", feedback: "Correct: £200 × 1.10 × 0.90 = £198." },
            { id: "c", text: "£202", feedback: "Check: £220 × 0.90 = £198." },
          ],
          correctOptionId: "b",
          explanation: "Equal rises and falls in % terms leave you slightly down.",
        },
      ],
    },
    {
      id: "time-in-market",
      title: "Why time in the market matters",
      minutes: 8,
      conceptIds: ["time-in-market", "volatility-intro"],
      blocks: [
        {
          type: "text",
          body: [
            "Share prices move every day for all sorts of reasons: news, interest rates, fear, excitement. Over days or months these moves are close to impossible to predict.",
            "Over longer periods, the day-to-day noise matters less and the growth of the underlying businesses has historically mattered more. That's the idea behind 'time in the market beats timing the market'.",
            "It is a pattern seen in history, not a law of nature. Long periods of poor returns have happened, and could happen again.",
          ],
        },
        {
          type: "keyTerm",
          term: "Volatility",
          definition: "How much and how quickly a price moves up and down. A volatile investment can change value a lot in a short time.",
        },
        {
          type: "callout",
          tone: "history",
          title: "A sharp fall and a fast recovery: 2020",
          body: "The US S&P 500 index fell about 34% between 19 February and 23 March 2020 as the pandemic spread, then reached a new high in August 2020. Anyone who sold in March locked in the loss; anyone who held on recovered within months. Recoveries are not always that fast.",
          source: "S&P Dow Jones Indices, S&P 500 price index, 2020.",
        },
        {
          type: "callout",
          tone: "history",
          title: "A slow recovery: 2008",
          body: "During the global financial crisis, global share markets fell by more than half between late 2007 and early 2009, and took several years to regain their earlier peak. An investor who needed their money in 2009 had a very bad outcome.",
          source: "MSCI World index (price, US dollars), October 2007 to March 2009.",
        },
        {
          type: "analogy",
          title: "Walking a dog up a hill",
          body: "The dog runs ahead, falls behind and zig-zags all over the place. That's the price. You walk steadily up the hill. That's the long-run growth of the businesses. Over a minute you can't predict where the dog will be; over an hour you can be fairly sure it ends up near you.",
        },
        {
          type: "exercise",
          kind: "timeInMarket",
          title: "Try it: regular investing over time",
          prompt: "Pick a monthly amount and a period. Compare a smooth average with a path that has a big fall partway through (both hypothetical).",
          reflect: "In the path with a fall, what happens to the money invested just after the fall?",
        },
      ],
      practical: {
        title: "Decide what you'll do in a fall, before it happens",
        steps: [
          "Imagine your investments dropped 30% next month.",
          "Write down what you would do, and why.",
          "Keep the note. Deciding calmly in advance is easier than deciding in a panic.",
        ],
      },
      takeaways: [
        "Short-term price moves are noisy and very hard to predict.",
        "Historically, longer holding periods smoothed out much of that noise, but not always quickly.",
        "Selling during a fall turns a temporary drop into a permanent loss.",
        "Money you need soon shouldn't depend on markets recovering in time.",
      ],
      quiz: [
        {
          id: "m1l6-q1",
          conceptId: "time-in-market",
          prompt: "What does 'time in the market beats timing the market' mean?",
          options: [
            { id: "a", text: "Staying invested for long periods has usually worked better than trying to jump in and out", feedback: "Right. Guessing the best moments to buy and sell is very hard, even for professionals." },
            { id: "b", text: "Markets always go up if you wait long enough", feedback: "Historically they have often recovered, but there's no guarantee, and it can take many years." },
            { id: "c", text: "You should invest only at certain times of day", feedback: "No. It's about years, not hours." },
          ],
          correctOptionId: "a",
          explanation: "It's an observation about history and the difficulty of timing, not a promise.",
        },
        {
          id: "m1l6-q2",
          conceptId: "volatility-intro",
          prompt: "Your investment is down 15% this month and you don't need the money for 15 years. What has actually happened?",
          options: [
            { id: "a", text: "You've permanently lost 15%", feedback: "It's a paper loss. It becomes permanent only if you sell, or if the investment never recovers." },
            { id: "b", text: "Its current price is lower; it's an unrealised loss that may or may not recover", feedback: "Correct. The loss is real on paper, but you haven't locked it in." },
            { id: "c", text: "Nothing at all", feedback: "The value really is lower right now; it just isn't locked in." },
          ],
          correctOptionId: "b",
          explanation: "Volatility is temporary unless you sell or the asset never recovers.",
        },
        {
          id: "m1l6-q3",
          conceptId: "time-in-market",
          prompt: "Why might someone saving for a house deposit in two years avoid shares?",
          options: [
            { id: "a", text: "A fall shortly before they need the money may not have time to recover", feedback: "Exactly. The 2008 example shows recoveries can take years." },
            { id: "b", text: "Shares are illegal for first-time buyers", feedback: "No. It's about timing risk." },
            { id: "c", text: "Shares never grow over two years", feedback: "They might grow a lot, or fall a lot. The uncertainty is the problem." },
          ],
          correctOptionId: "a",
          explanation: "Short horizons leave little time to recover from a fall.",
        },
      ],
    },
    {
      id: "returns-not-guaranteed",
      title: "Why investment returns are not guaranteed",
      minutes: 7,
      conceptIds: ["returns-uncertain", "volatility-intro"],
      blocks: [
        {
          type: "text",
          body: [
            "Every investment return is a range of possible outcomes, not a single number. Even when people quote an average, the actual result could be well above or well below it.",
            "Individual companies can fail completely, taking their share price to zero. Diversified funds spread that risk but can still fall sharply when whole markets fall.",
            "Anyone promising high returns with no risk is either mistaken or trying to scam you. The FCA's ScamSmart site lists warning signs.",
          ],
        },
        {
          type: "workedExample",
          title: "Same average, different result",
          setup: "Investment A returns +30% then −20%. The simple average of those two years is +5% a year.",
          steps: [
            { label: "After year 1", working: "£1,000 × 1.30 = £1,300" },
            { label: "After year 2", working: "£1,300 × 0.80 = £1,040" },
            { label: "Compare with a steady 5% each year", working: "£1,000 × 1.05 × 1.05 = £1,102.50" },
          ],
          result: "Same 'average' of 5%, but the bumpy path ended £62.50 lower. Big swings cost you, even when the average looks fine.",
        },
        {
          type: "callout",
          tone: "risk",
          title: "Past performance is not a reliable guide",
          body: "A fund or share that did brilliantly over the last five years may do badly over the next five. Strong past returns can even mean prices already reflect high hopes.",
        },
        {
          type: "keyTerm",
          term: "Permanent loss",
          definition: "A loss that will never be recovered, such as a company going bust, or selling after a fall and never buying back in. Different from a temporary fall in price.",
        },
        {
          type: "check",
          question: {
            id: "m1l7-check",
            conceptId: "returns-uncertain",
            prompt: "A website promises '15% a year, guaranteed, no risk'. What should you conclude?",
            options: [
              { id: "a", text: "It's a great opportunity", feedback: "Guaranteed high returns with no risk don't exist in real investing. This is a classic scam warning sign." },
              { id: "b", text: "It's a major red flag", feedback: "Right. Check the firm on the FCA register and look at ScamSmart before going any further." },
            ],
            correctOptionId: "b",
            explanation: "Higher potential return always comes with higher risk. 'Guaranteed' plus 'high return' is a warning sign.",
          },
        },
      ],
      practical: {
        title: "Check a firm on the FCA register",
        steps: [
          "Search 'FCA register' and open the official register.",
          "Look up Trading 212, or another firm you use or are considering.",
          "Note what the firm is authorised to do. If a firm isn't on the register, be very careful.",
        ],
      },
      takeaways: [
        "Returns are a range of outcomes, not a single promised number.",
        "Bumpy returns grow less than steady ones with the same simple average.",
        "Past performance doesn't reliably predict future performance.",
        "'Guaranteed high returns' is a scam warning sign.",
      ],
      quiz: [
        {
          id: "m1l7-q1",
          conceptId: "returns-uncertain",
          prompt: "Which outcome is possible when you buy shares in a single company?",
          options: [
            { id: "a", text: "Losing everything you put in", feedback: "Correct. If the company fails, its shares can become worthless." },
            { id: "b", text: "Losing more than you put in", feedback: "Not with ordinary shares bought outright. Leveraged products like CFDs are different; they come later in the course." },
            { id: "c", text: "Neither, shares are protected", feedback: "There's no protection against share prices falling." },
          ],
          correctOptionId: "a",
          explanation: "With ordinary shares the most you can lose is what you invested; that can be 100%.",
        },
        {
          id: "m1l7-q2",
          conceptId: "returns-uncertain",
          prompt: "A fund doubled over the last three years. What does that tell you about the next three?",
          options: [
            { id: "a", text: "It will probably double again", feedback: "Past performance is not a reliable guide. It could do much worse." },
            { id: "b", text: "Very little on its own", feedback: "Right. You'd need to understand what it owns and why it rose." },
            { id: "c", text: "It's guaranteed to fall", feedback: "Not guaranteed either way." },
          ],
          correctOptionId: "b",
          explanation: "Past returns don't reliably predict future returns.",
        },
        {
          id: "m1l7-q3",
          conceptId: "volatility-intro",
          prompt: "+30% one year, −20% the next. Starting with £1,000, what do you end with?",
          options: [
            { id: "a", text: "£1,100", feedback: "That adds the percentages (+10%). They multiply instead." },
            { id: "b", text: "£1,040", feedback: "Correct: £1,000 × 1.3 × 0.8 = £1,040." },
            { id: "c", text: "£1,000", feedback: "Check the multiplication: 1.3 × 0.8 = 1.04." },
          ],
          correctOptionId: "b",
          explanation: "Percentage changes multiply: 1.30 × 0.80 = 1.04.",
        },
      ],
    },
  ],
};
