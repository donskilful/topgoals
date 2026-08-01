/**
 * The contract every tips provider is read through.
 *
 * Providers are wildly inconsistent — different markup, different market vocabulary, different
 * ideas of what a "prediction" is — so each one gets a small adapter that turns its pages into
 * the same neutral shape. Everything downstream (ingestion, settlement, the per-provider
 * record) then works identically no matter where a pick came from, and adding a provider is a
 * new file rather than a change to the pipeline.
 *
 * ## What an adapter deliberately does *not* do
 *
 * An adapter reports what a page said and nothing more. It does not invent odds, confidence or
 * probability figures that the source didn't publish, and it does not resolve the fixture to
 * one of our matches — that's ingestion's job, because it needs the database. An adapter that
 * can't read a card skips it; a partially-read pick is worse than a missing one.
 */

/** One published selection, exactly as the provider stated it. */
export type ProviderTip = {
  /** Home side, as the provider spells it. */
  home: string;
  /** Away side, as the provider spells it. */
  away: string;
  /**
   * Kick-off as the provider gives it — a *hint only*.
   *
   * Providers rarely state a timezone, and this one renders its times client-side from an
   * unlabelled value. Rather than guess an offset and post fixtures at the wrong time, this is
   * used solely to narrow the search for the fixture in our own data, and the matched match's
   * kick-off is what gets stored. See `src/lib/sync/provider-tips.ts`.
   */
  kickoffHint: Date;
  /** The provider's own competition label, e.g. "Norway: Eliteserien". A hint, like the time. */
  competitionLabel: string;
  /** The selection text, verbatim: "BTTS and Rangers to win". */
  pick: string;
  /** Link to the provider's page for this pick, for attribution. */
  url: string | null;
};

export type ProviderAdapter = {
  /** Stable identifier stored on every tip as `source.name`. Changing it orphans a record. */
  name: string;
  /** The provider's home page, shown as attribution. */
  homepage: string;
  /**
   * Reads the provider's current published picks.
   *
   * Implementations should resolve rather than throw on a single bad page — one unreachable
   * URL shouldn't lose the picks from the others.
   */
  fetchTips(): Promise<ProviderTip[]>;
};
