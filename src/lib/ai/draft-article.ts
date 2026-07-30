import Anthropic from "@anthropic-ai/sdk";
import type { StoryCluster } from "@/lib/feeds/cluster";

/**
 * Writes an original TopGoals article from the facts of a story.
 *
 * The distinction this file exists to enforce: **facts are not copyrightable, but the
 * words used to report them are.** So the model is given the facts a cluster of feeds
 * reported and asked to write about the event — not handed a passage and asked to
 * reword it. A reworded passage is a derivative work no matter how different the
 * wording ends up; an independent account of the same match, transfer or team news is
 * simply our own reporting of a public fact.
 *
 * Two consequences follow, and both are enforced in the prompt below:
 *  - No sentence, phrase or distinctive turn of expression from a source survives.
 *  - Nothing is added that the sources didn't state. On a betting-adjacent site an
 *    invented injury or a fabricated quote is a genuine harm to readers, not a
 *    stylistic slip.
 */

const MODEL = "claude-opus-5";

/** Lazy so an unset key is a clean skip, not a module-load crash. */
let client: Anthropic | null = null;

export function isDrafterConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export class DrafterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrafterError";
  }
}

export type ArticleDraft = {
  category: "News" | "Transfer";
  title: string;
  excerpt: string;
  /** Body paragraphs separated by blank lines, matching how articles are stored. */
  body: string;
};

/**
 * Constrains the response so a malformed draft can't reach the database. The API
 * validates against this before returning, and retries the model on mismatch.
 */
const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["News", "Transfer"],
      description: "Transfer for completed deals, bids, contract talks and moves; News otherwise.",
    },
    title: {
      type: "string",
      description:
        "Original headline, 40-80 characters. Must not reuse the wording of any source headline.",
    },
    excerpt: {
      type: "string",
      description: "One original sentence, 100-200 characters, summarising the story for a card.",
    },
    body: {
      type: "string",
      description:
        "Three to five paragraphs of original prose, separated by blank lines. No markdown, no headings.",
    },
    confident: {
      type: "boolean",
      description:
        "False if the facts available are too thin, too speculative, or too unclear to write an accurate article. When false the article is discarded.",
    },
    skipReason: {
      type: "string",
      description: "When confident is false, one short sentence explaining why.",
    },
  },
  required: ["category", "title", "excerpt", "body", "confident", "skipReason"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a football reporter writing for TopGoals, a football news and betting-tips site. You write the site's own coverage of events in the site's own words.

# What you are given
Facts drawn from public news feeds: headlines and one-or-two-sentence summaries about a single football story, sometimes from more than one publisher.

# What you produce
TopGoals' own article reporting that event.

# The two rules that matter most

## 1. Write from the facts, never from the wording
Report the event. Do not rewrite, reword, paraphrase or restructure the source text. Read the input to learn *what happened*, then set it aside and write the story yourself, the way a reporter who attended the match would.

Concretely: no sentence, clause, or distinctive phrase from the input may appear in your output. Ordinary factual language is unavoidable and fine — names, scorelines, club names, "signed a four-year contract". A turn of phrase someone chose is not.

If you find yourself moving words around rather than composing a sentence from scratch, stop and write the sentence again from the fact alone.

## 2. Never state anything the facts don't support
Add nothing. No invented quotes — not even plausible ones, and not even attributed vaguely. No scores, minutes, fees, contract lengths, dates or injuries that aren't in the input. No implied causes ("the pressure of the title race told"). No predictions.

Readers of this site place bets. A fabricated detail can cost them money, so an article that is thinner than you'd like is always better than one that is fuller than the facts.

If the input is too thin, too speculative (rumour with no substance), or too unclear to support an accurate short article, set confident to false and explain why in skipReason. Discarding a story costs nothing. Being wrong costs a reader.

# Voice
Direct and plain. Short paragraphs — two or three sentences. Lead with what happened, then the context that makes it matter. No hype, no clichés ("the Gunners will be hoping...", "all eyes will be on..."), no rhetorical questions, no sign-off flourishes. Do not address the reader. Do not mention betting, odds or tips.

Write in British English. Refer to clubs as singular where British usage does ("Arsenal is" is wrong; "Arsenal are" is right).

# Attribution
Do not name the publishers or write "according to reports" — the article carries its source links separately. Just report the story.`;

/** Presents a cluster as a list of facts, with the source wording clearly bounded. */
function buildFactSheet(cluster: StoryCluster): string {
  const lines = cluster.items.map((item, index) => {
    const parts = [
      `Report ${index + 1}`,
      `Headline: ${item.title}`,
      item.summary ? `Summary: ${item.summary}` : null,
      item.categories.length > 0 ? `Tagged: ${item.categories.join(", ")}` : null,
      `Published: ${item.publishedAt.toISOString()}`,
    ].filter(Boolean);

    return parts.join("\n");
  });

  return lines.join("\n\n---\n\n");
}

/**
 * Drafts one article. Returns null when the model judges the facts too thin to
 * report accurately — a normal, expected outcome, not an error.
 */
export async function draftArticle(cluster: StoryCluster): Promise<ArticleDraft | null> {
  if (!isDrafterConfigured()) {
    throw new DrafterError("ANTHROPIC_API_KEY is not set.");
  }

  const userPrompt = `Here are the facts reported about one football story${
    cluster.sources.length > 1 ? `, by ${cluster.sources.length} separate publishers` : ""
  }. Write TopGoals' own article about this event.

${buildFactSheet(cluster)}

Remember: report the event in your own words from these facts. Do not reword the text above, and do not add anything it does not state.`;

  let response;

  try {
    // Streamed because a multi-paragraph draft at high effort can outlast the
    // non-streaming HTTP timeout.
    const stream = getClient().messages.stream({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: DRAFT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    response = await stream.finalMessage();
  } catch (error) {
    throw new DrafterError(
      `Claude request failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  // A safety refusal is a legitimate reason to skip a story, not a pipeline failure.
  if (response.stop_reason === "refusal") {
    console.warn(
      `Draft declined for “${cluster.items[0].title}”:`,
      response.stop_details?.category ?? "no category",
    );
    return null;
  }

  if (response.stop_reason === "max_tokens") {
    throw new DrafterError("Draft was cut off before completing.");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new DrafterError("Claude returned no text content.");
  }

  let parsed: {
    category: "News" | "Transfer";
    title: string;
    excerpt: string;
    body: string;
    confident: boolean;
    skipReason: string;
  };

  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new DrafterError("Claude returned malformed JSON.");
  }

  if (!parsed.confident) {
    console.log(`Skipped “${cluster.items[0].title}”: ${parsed.skipReason}`);
    return null;
  }

  const draft: ArticleDraft = {
    // The cluster's own classification wins on disagreement: it comes from the
    // publisher's own filing, which is more reliable than inference from a headline.
    category: cluster.category === "Transfer" ? "Transfer" : parsed.category,
    title: parsed.title.trim(),
    excerpt: parsed.excerpt.trim(),
    body: parsed.body.trim(),
  };

  if (!draft.title || !draft.excerpt || !draft.body) {
    throw new DrafterError("Draft was missing a required field.");
  }

  return draft;
}
