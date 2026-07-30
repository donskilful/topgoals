"use server";

import { requireRole } from "@/lib/auth-helpers";
import { logAudit } from "@/lib/audit";
import { syncMatches } from "@/lib/sync/matches";
import { FootballDataError, isFootballDataConfigured } from "@/lib/football-data";
import { formError, formSuccess, runAction, type FormState } from "@/lib/form-state";
import mongoose from "mongoose";

/**
 * "Sync now" in the CMS — the same job the cron runs, triggered by hand.
 *
 * Useful when a score looks stale mid-match and someone wants to force a refresh
 * rather than wait for the next scheduled run.
 */
export async function syncScoresNow(): Promise<FormState> {
  return runAction(async () => {
    const actor = await requireRole();

    if (!isFootballDataConfigured()) {
      return formError(
        "Live scores aren't connected yet. Add FOOTBALL_DATA_API_KEY to your environment.",
      );
    }

    try {
      const result = await syncMatches();

      await logAudit({
        actor,
        action: "update",
        entityType: "Match",
        // Not tied to one match, so the log gets a synthetic id for the run itself.
        entityId: String(new mongoose.Types.ObjectId()),
        summary:
          `Ran score sync — ${result.created} added, ${result.updated} updated, ` +
          `${result.unchanged} unchanged${result.skippedManual > 0 ? `, ${result.skippedManual} skipped (edited by hand)` : ""}`,
        after: result,
      });

      if (result.created === 0 && result.updated === 0) {
        return formSuccess(
          `Already up to date — checked ${result.fetched} fixtures, nothing had changed.`,
        );
      }

      return formSuccess(
        `Synced ${result.fetched} fixtures: ${result.created} added, ${result.updated} updated.` +
          (result.skippedManual > 0
            ? ` ${result.skippedManual} left alone because they were edited by hand.`
            : ""),
      );
    } catch (error) {
      if (error instanceof FootballDataError) return formError(error.message);
      throw error;
    }
  });
}
