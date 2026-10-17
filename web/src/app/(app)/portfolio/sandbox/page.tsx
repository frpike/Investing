import type { Metadata } from "next";
import { Sandbox } from "./sandbox";

export const metadata: Metadata = { title: "What-if sandbox" };

export default function SandboxPage() {
  return <Sandbox />;
}
