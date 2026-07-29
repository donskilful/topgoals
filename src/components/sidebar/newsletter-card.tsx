export function NewsletterCard() {
  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <h4 className="mb-3 font-display text-[15px] font-normal uppercase tracking-wide">Get Tips First</h4>
      <p className="mb-3 text-[12.5px] text-floodlight-dim">
        Join 40,000+ punters getting daily picks straight to Telegram before kickoff.
      </p>
      <form className="flex gap-2">
        <input
          type="email"
          placeholder="you@email.com"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-[7px] border border-line bg-charcoal-2 px-2.5 py-[9px] font-body text-[13px] text-floodlight placeholder:text-floodlight-faint"
        />
        <button
          type="submit"
          className="rounded-[7px] bg-pitch px-3.5 py-[9px] text-[13px] font-bold text-floodlight transition-colors hover:bg-pitch-bright hover:text-ink"
        >
          Join
        </button>
      </form>
    </div>
  );
}
