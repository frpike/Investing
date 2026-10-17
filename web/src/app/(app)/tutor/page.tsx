import type { Metadata } from "next";
import { Suspense } from "react";
import { TutorChat } from "./tutor-chat";

export const metadata: Metadata = { title: "Tutor" };

export default function TutorPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <TutorChat />
    </Suspense>
  );
}
