import type { ExtractedStory } from "@/lib/news/extract";

/**
 * Writes TopGoals' own article from extracted facts.
 *
 * Every sentence here is composed from the structured data in `ExtractedStory` — no source
 * phrasing reaches this file, by design. `extract.ts` deliberately throws away quoted
 * fragments and returns only who, which clubs, what happened and how certain it is.
 *
 * ## The rule that governs the wording
 *
 * **Certainty is honoured exactly.** A `reported` story is written as a report and credited
 * to the outlet that made it — "Sky Sports report that Real Madrid are preparing an offer
 * for Rodri" — never as a settled fact. This isn't hedging for its own sake: readers here
 * are placing bets, and the difference between a club being *linked with* a player and
 * having *signed* one is money. Where a claim is unconfirmed, who is making it is itself a
 * material fact, so it's stated.
 *
 * `context` carries anything we know from our own database (league position, recent form),
 * which is what keeps these from being one-line restatements of a headline.
 */

export type ComposeContext = {
  /** Publishers reporting this, for attribution. */
  sources: string[];
  /** e.g. "Chelsea sit 4th in the Premier League" — from our own standings. */
  clubStanding?: string;
  fromClubStanding?: string;
};

export type ComposedArticle = {
  category: "News" | "Transfer";
  title: string;
  excerpt: string;
  body: string;
};

/** "Sky Sports", "Sky Sports and Guardian Football", "A, B and C". */
function listSources(sources: string[]): string {
  const unique = [...new Set(sources)];

  if (unique.length === 0) return "reports";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;

  return `${unique.slice(0, -1).join(", ")} and ${unique.at(-1)}`;
}

/**
 * Clubs take a plural verb in British football writing — "Chelsea have signed", not
 * "Chelsea has signed" — which is the register the rest of the site is written in.
 */
function compose(story: ExtractedStory, context: ComposeContext): ComposedArticle | null {
  const attribution = listSources(context.sources);
  const { subject, club, fromClub, fee, contractLength } = story;

  const feeClause = fee ? ` in a deal reported at ${fee}` : "";
  const contractClause = contractLength ? ` on a ${contractLength} contract` : "";

  switch (story.kind) {
    case "transfer_completed": {
      if (!club) return null;

      const from = fromClub ? ` from ${fromClub}` : "";

      return {
        category: "Transfer",
        title: `${club} complete signing of ${subject}`,
        excerpt: `${subject} has joined ${club}${from}, a move confirmed by ${attribution}.`,
        body: [
          `${club} have completed the signing of ${subject}${from}${feeClause}${contractClause}.`,
          [
            `The move was confirmed by ${attribution}.`,
            context.clubStanding ? `${context.clubStanding}.` : null,
            context.fromClubStanding ? `${context.fromClubStanding}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ].join("\n\n"),
      };
    }

    case "transfer_interest": {
      if (!club) return null;

      const currently = fromClub ? `, currently at ${fromClub}` : "";

      return {
        category: "Transfer",
        // "linked with" rather than anything firmer — the headline reported an intention.
        title: `${club} linked with move for ${subject}`,
        excerpt: `${attribution} report that ${club} are pursuing a move for ${subject}. Nothing has been agreed.`,
        body: [
          `${club} have been linked with a move for ${subject}${currently}${feeClause}.`,
          [
            `The report comes from ${attribution}.`,
            `No deal has been confirmed by either club, and interest at this stage does not always lead to a transfer.`,
            context.clubStanding ? `${context.clubStanding}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ].join("\n\n"),
      };
    }

    case "contract_signed": {
      const withClub = club ? ` with ${club}` : "";

      return {
        category: "Transfer",
        title: club ? `${subject} signs new ${club} contract` : `${subject} signs new contract`,
        excerpt: `${subject} has agreed fresh terms${withClub}, according to ${attribution}.`,
        body: [
          `${subject} has signed a new contract${withClub}${contractClause}.`,
          [
            `The extension was reported by ${attribution}.`,
            context.clubStanding ? `${context.clubStanding}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ].join("\n\n"),
      };
    }

    case "manager_departure": {
      if (!club) return null;

      return {
        category: "News",
        title: `${subject} leaves ${club}`,
        excerpt: `${subject} has departed ${club}, as confirmed by ${attribution}.`,
        body: [
          `${subject} has left ${club}.`,
          [
            `The departure was confirmed by ${attribution}.`,
            context.clubStanding ? `${context.clubStanding}.` : null,
            `No successor has been confirmed here; any names in circulation remain speculation until the club announces an appointment.`,
          ]
            .filter(Boolean)
            .join(" "),
        ].join("\n\n"),
      };
    }

    case "manager_appointment": {
      if (!club) return null;

      return {
        category: "News",
        title: `${club} appoint ${subject}`,
        excerpt: `${club} have named ${subject} as their new manager, according to ${attribution}.`,
        body: [
          `${club} have appointed ${subject} as manager${contractClause}.`,
          [
            `The appointment was reported by ${attribution}.`,
            context.clubStanding ? `${context.clubStanding}.` : null,
          ]
            .filter(Boolean)
            .join(" "),
        ].join("\n\n"),
      };
    }

    default:
      return null;
  }
}

export function composeArticle(
  story: ExtractedStory,
  context: ComposeContext,
): ComposedArticle | null {
  const article = compose(story, context);
  if (!article) return null;

  /**
   * A composed sentence still carrying a capture artefact should never publish — a doubled
   * space or a space before punctuation means an optional clause resolved to nothing and
   * left a hole.
   *
   * Matched on literal spaces, not `\s`: `\s{2,}` also matches the `\n\n` between paragraphs,
   * which silently rejected every article this module produced.
   */
  if (/ {2,}| [.,]/.test(article.body)) return null;

  return article;
}
