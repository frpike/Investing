import { ArrowRight, BookOpen, ChartPie, MessageCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { MODULES } from "@/content";
import { EducationNote } from "@/components/notes";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-serif text-xl font-semibold tracking-tight">Groundwork</span>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/privacy" className="px-3 py-1.5 text-muted-foreground hover:text-foreground">Privacy</Link>
          <Button asChild size="sm" variant="outline"><Link href="/sign-in">Sign in</Link></Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-8 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-16">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Investing, from first principles</p>
            <h1 className="text-4xl font-semibold leading-[1.1] md:text-5xl">Understand your investments before you trust them with your money.</h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Short, interactive lessons that start at zero. Then learn with your own Trading 212 portfolio, with a tutor that explains what&apos;s happening and why, and never tells you what to buy.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/start">Start learning, free <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="ghost"><Link href="/learn">Browse the course</Link></Button>
            </div>
            <p className="text-sm text-muted-foreground">No account needed to start. Your progress stays in your browser until you choose to save it.</p>
          </div>

          <figure className="rounded-2xl border bg-card p-6 shadow-sm" aria-label="Example from lesson 5">
            <figcaption className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">From Lesson 5 · Worked example</figcaption>
            <p className="mb-4 font-serif text-xl">Down 20%, then up 20%. Are you back to even?</p>
            <ol className="space-y-2 font-mono text-sm tabular">
              <li className="rounded-lg bg-muted px-4 py-2">£100 × 0.80 = £80</li>
              <li className="rounded-lg bg-muted px-4 py-2">£80 × 1.20 = £96</li>
            </ol>
            <p className="mt-4 text-sm">You&apos;re down £4. The rise was on a smaller amount, which is why avoiding big losses matters so much.</p>
          </figure>
        </section>

        <section className="border-y bg-card/60">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-3">
            {[
              { icon: BookOpen, title: "Learn the why", body: "Ten modules, from what a share is to writing your own investment policy. Every lesson has worked numbers, a calculator to play with and a quiz that checks it stuck." },
              { icon: ChartPie, title: "Use your own portfolio", body: "Import your Trading 212 history or add holdings by hand. See concentration, currency exposure and gains with the working shown, and test hypothetical 'what ifs'." },
              { icon: MessageCircle, title: "Ask a patient tutor", body: "Ask anything, from 'what is a P/E ratio?' to 'why is my portfolio down?'. It explains, cites sources for anything current, and says so when it doesn't know." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="space-y-2">
                <Icon className="size-6 text-primary" aria-hidden />
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold">What we won&apos;t do</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />Tell you what to buy or sell, or promise returns.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />Place trades, or ask for your Trading 212 password.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />Reward you for lucky simulated profits. We reward understanding risk.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />Invent prices or news. Missing data is shown as missing.</li>
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />Sell your data.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold">The course</h2>
            <ol className="divide-y rounded-xl border bg-card">
              {MODULES.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span><span className="mr-2 text-muted-foreground tabular">{m.position}.</span>{m.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.status === "available" ? `${m.lessons.length} lessons` : "Coming soon"}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <EducationNote />
          <div className="flex gap-4"><Link href="/privacy">Privacy and data</Link><span>Not affiliated with Trading 212.</span></div>
        </div>
      </footer>
    </div>
  );
}
