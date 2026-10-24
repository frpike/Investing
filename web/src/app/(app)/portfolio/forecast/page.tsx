import type { Metadata } from "next";
import { ForecastView } from "./forecast-view";

export const metadata: Metadata = { title: "Projections and what-ifs" };

export default function ForecastPage() {
  return <ForecastView />;
}
