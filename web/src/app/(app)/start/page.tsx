import type { Metadata } from "next";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Get started" };

export default function StartPage() {
  return <Onboarding />;
}
