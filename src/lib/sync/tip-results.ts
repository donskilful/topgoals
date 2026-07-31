import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { Match } from "@/lib/models/match";
import { settleTip, type MatchOutcome } from "@/lib/tips/settle";
import { describeUnsettleable } from "@/lib/tips/markets";
import { sameTeam } from "@/lib/tips/teams";
import { getAutomationActor } from "@/lib/automation-actor";
import { logAudit } from "@/lib/audit";
import { revalidateContent } from "@/lib/actions/revalidate";

/**
 * Settles pending tips from the results we already hold.
 *
 * Reads finished fixtures out of our own database — the score sync put them there — so this
 * costs no provider requests and can run as often as we like.
 *
 * Why it exists: settling by hand meant the public track record depended on somebody
 * remembering. A forgotten loss silently inflates the win rate, and that number is the whole
 * basis on which a reader decides to risk money on a tip. Settling from the actual scoreline
 * makes the record self-maintaining and impossible to flatter by omission.
 *
 * Nothing is ever guessed. A tip whose selection can't be graded from a scoreline, or whose
 * fixture can't be identified beyond doubt, is left pending with a note explaining why — see
 * `src/lib/tips/markets.ts`.
 */

/**
 * How long after kick-off to start looking for a result.
 *
 * A match runs ~105 minutes with the interval; three hours clears extra time and the delay
 * before the provider marks it FINISHED.
 */
const SETTLE_AFTER_HOURS = 3;

/** How far back to keep trying. Old unsettled tips are a manual problem, not a job to retry forever. */
const LOOKBACK_DAYS = 14;

/** Widest gap allowed between a tip's kick-off and a candidate fixture's, when matching by name. */
const KICKOFF_TOLERANCE_HOURS = 12;

export type TipSettlementResult = {
  pending: number;
  settled: number;
  won: number;
  lost: number;
  void: number;
  /** Left pending on purpose, with the reason — needs a human. */
  skipped: { fixture: string; pick: string; reason: string }[];
  failed: number;
};

/**
 * The shape settlement needs from a fixture.
 *
 * Declared structurally rather than derived from the Mongoose query type: `.lean()` widens to
 * `{}` through `ReturnType<typeof Match.findById>`, which loses every field and made the
 * compiler reject perfectly valid access.
 */
type ResolvedMatch = {
  _id: unknown;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  halfTimeHome?: number | null;
  halfTimeAway?: number | null;
  status: string;
};

function toOutcome(match: ResolvedMatch): MatchOutcome {
  // Scores are stored as display strings ("2", or an en dash before kick-off).
  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  };

  return {
    home: match.home,
    away: match.away,
    homeScore: toNumber(match.homeScore),
    awayScore: toNumber(match.awayScore),
    halfTimeHome: match.halfTimeHome ?? null,
    halfTimeAway: match.halfTimeAway ?? null,
    status: match.status as MatchOutcome["status"],
  };
}

/**
 * Finds the fixture a tip refers to.
 *
 * Prefers an explicit `matchId`, which is what the CMS sets going forward. Falls back to
 * reading the two team names out of the free-text `fixture` and looking for a finished match
 * with both, near the same kick-off — necessary because every tip written before this existed
 * has no link.
 *
 * **Exactly one candidate, or nothing.** Two plausible fixtures means we don't know which was
 * tipped, and settling against the wrong match would write a confidently wrong result into
 * the public record.
 */
async function resolveMatch(tip: {
  matchId?: unknown;
  fixture: string;
  kickoffAt: Date;
}): Promise<ResolvedMatch | null> {
  if (tip.matchId) {
    return (await Match.findById(tip.matchId).lean()) as ResolvedMatch | null;
  }

  // "Man United vs Liverpool" / "Man United v Liverpool" / "Man United - Liverpool"
  const parts = tip.fixture.split(/\s+(?:vs?\.?|-|–|@)\s+/i);
  if (parts.length !== 2) return null;

  const [left, right] = parts.map((part) => part.trim());
  if (left.length < 3 || right.length < 3) return null;

  const tolerance = KICKOFF_TOLERANCE_HOURS * 60 * 60 * 1000;

  const candidates = (await Match.find({
    kickoffAt: {
      $gte: new Date(tip.kickoffAt.getTime() - tolerance),
      $lte: new Date(tip.kickoffAt.getTime() + tolerance),
    },
  }).lean()) as ResolvedMatch[];

  const matches = candidates.filter((match) => {
    const pairs = (a: string, b: string) => sameTeam(a, match.home) && sameTeam(b, match.away);

    // Either orientation — a tipster may write the away side first.
    return pairs(left, right) || pairs(right, left);
  });

  return matches.length === 1 ? matches[0] : null;
}

export async function syncTipResults(): Promise<TipSettlementResult> {
  await dbConnect();

  const now = Date.now();
  const settleBefore = new Date(now - SETTLE_AFTER_HOURS * 60 * 60 * 1000);
  const since = new Date(now - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const pending = await Tip.find({
    result: "pending",
    kickoffAt: { $lte: settleBefore, $gte: since },
  })
    .sort({ kickoffAt: 1 })
    .lean();

  const result: TipSettlementResult = {
    pending: pending.length,
    settled: 0,
    won: 0,
    lost: 0,
    void: 0,
    skipped: [],
    failed: 0,
  };

  if (pending.length === 0) return result;

  const actor = await getAutomationActor();

  for (const tip of pending) {
    try {
      const match = await resolveMatch(tip);

      if (!match) {
        result.skipped.push({
          fixture: tip.fixture,
          pick: tip.pick,
          reason: tip.matchId
            ? "the linked fixture no longer exists"
            : "couldn't identify the fixture from its name — link it in the CMS",
        });
        continue;
      }

      const settlement = settleTip(tip.pick, toOutcome(match));

      if (settlement.result === null) {
        result.skipped.push({
          fixture: tip.fixture,
          pick: tip.pick,
          // A market we know we can't grade gets the specific reason, not the generic one.
          reason: describeUnsettleable(tip.pick) ?? settlement.reason,
        });
        continue;
      }

      const updated = await Tip.findByIdAndUpdate(
        tip._id,
        {
          $set: {
            result: settlement.result,
            settledAt: new Date(),
            settledBy: "auto",
            settlementNote: settlement.reason,
            // Record the link when it was resolved by name, so it never needs resolving again.
            matchId: match._id,
          },
        },
        { returnDocument: "after" },
      ).lean();

      result.settled += 1;
      if (settlement.result === "won") result.won += 1;
      else if (settlement.result === "lost") result.lost += 1;
      else result.void += 1;

      await logAudit({
        actor,
        action: "update",
        entityType: "Tip",
        entityId: String(tip._id),
        summary: `Settled ${tip.fixture} (${tip.pick}) as ${settlement.result} — ${settlement.reason}`,
        before: tip,
        after: updated,
      });
    } catch (error) {
      result.failed += 1;
      console.error(`Could not settle "${tip.fixture} — ${tip.pick}":`, error);
    }
  }

  // The win rate, the W/L pills and the tips list all move when a tip settles.
  if (result.settled > 0) revalidateContent("tip", "/admin/tips");

  console.log(
    `Tip settlement: ${result.pending} due, ${result.settled} settled ` +
      `(${result.won}W ${result.lost}L ${result.void}V), ${result.skipped.length} left for a human, ` +
      `${result.failed} failed.`,
  );

  return result;
}
