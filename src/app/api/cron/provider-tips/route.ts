import { runCronJob } from "@/lib/cron-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Provider tip ingestion. Driven by Vercel Cron (see vercel.json). */
export const GET = (request: Request) => runCronJob(request, "provider-tips");
