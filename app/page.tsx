import TimelineClient from "./timeline-client";
import { SAMPLE_STORIES } from "../lib/timeline";

export default function HomePage() {
  return <TimelineClient stories={SAMPLE_STORIES} />;
}
