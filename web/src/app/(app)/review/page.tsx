import type { Metadata } from "next";
import { Review } from "./review";

export const metadata: Metadata = { title: "Review" };

export default function ReviewPage() {
  return <Review />;
}
