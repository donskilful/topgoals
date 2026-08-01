import type { ProviderAdapter } from "@/lib/providers/types";
import { footballPredictionsNet } from "@/lib/providers/footballpredictions";

/**
 * Providers read on every ingestion run.
 *
 * One entry today. The framework exists for more than one because the plan is a stable of
 * providers ranked against each other on verified results — but a provider is only worth adding
 * if it publishes picks in readable HTML and permits crawling, and most don't. Of eight surveyed,
 * this was the only one that qualified; the rest either return 403 to an honest crawler, sit
 * behind a bot challenge, disallow the relevant paths in robots.txt, or render client-side. Those
 * findings are recorded in `footballpredictions.ts` so the survey doesn't have to be repeated.
 *
 * Adding a provider is this array plus one adapter file. Nothing downstream changes.
 */
export const PROVIDERS: ProviderAdapter[] = [footballPredictionsNet];
