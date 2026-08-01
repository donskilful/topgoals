import { runCronJob } from "@/lib/cron-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** League tables. Driven by Vercel Cron (see vercel.json). */
export const GET = (request: Request) => runCronJob(request, "standings");
