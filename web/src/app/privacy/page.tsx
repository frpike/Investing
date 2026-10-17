import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy and data" };

// Plain-English summary of data handling. Must be reviewed by a qualified person and turned
// into a full privacy notice before launch (see docs/PLAN.md, section 6).
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10">
      <Link href="/" className="font-serif text-xl font-semibold">Groundwork</Link>
      <h1 className="text-3xl font-semibold">Privacy and your data</h1>
      <p className="text-sm text-muted-foreground">Draft summary for the MVP. A full privacy notice will replace it before public launch.</p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What we store</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Learning data</strong>: your onboarding answers, quiz answers, lesson progress and concept mastery, so we can personalise the course.</li>
          <li><strong>Portfolio data you choose to add</strong>: holdings you type in and transactions from Trading 212 CSV files you upload, plus a record of each import (file name, a fingerprint of the file, row counts and errors) so figures can be traced to their source.</li>
          <li><strong>Account data</strong>: your email address, if you create an account.</li>
        </ul>
        <p>We don&apos;t ask for your age, job, income or Trading 212 password, and we don&apos;t need them.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Where it lives</h2>
        <p>As a guest, everything stays in your browser. With an account it&apos;s stored in our database (Supabase, EU/UK region chosen at setup), where each user can only read their own rows.</p>
        <p>When you ask the tutor a question, your question and a summary of your progress and portfolio are sent to Anthropic, which provides the AI model, to generate the answer. As a guest you can switch off sharing your portfolio with the tutor.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Your controls</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Export everything as a file from Settings.</li>
          <li>Delete your account and all associated data from Settings. Deletion is immediate and permanent.</li>
          <li>We never sell your data, and we never take payments for featuring investments.</li>
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">Groundwork is an education tool, not a regulated financial adviser, and is not affiliated with Trading 212.</p>
    </div>
  );
}
