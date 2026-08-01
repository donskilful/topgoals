import { runCronJob } from "@/lib/cron-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Live scores and the fixture window. Driven by Vercel Cron (see vercel.json). */
export const GET = (request: Request) => runCronJob(request, "scores");
