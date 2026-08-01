import { getProviderRecords, MIN_SETTLED_TIPS, MIN_WIN_RATE } from "@/lib/data/providers";

/**
 * How each tips provider is performing, on results we settled ourselves.
 *
 * Shown in the CMS rather than on the public site. It's an operational view — it tells an editor
 * which providers are earning their place and which are quietly failing, and a provider that
 * hasn't qualified yet is listed rather than hidden, because "nothing is publishing and here's
 * why" is the thing an editor most needs to be able to see.
 *
 * Renders nothing at all when no provider tips have been ingested, so the page doesn't carry an
 * empty panel explaining a feature that isn't in use.
 */
export async function ProviderRecords() {
  const records = await getProviderRecords();

  if (records.length === 0) return null;

  return (
    <section className="mb-8 rounded-xl border border-line bg-charcoal p-4">
      <h2 className="font-display text-lg uppercase tracking-wide">Provider records</h2>
      <p className="mt-1 mb-4 max-w-2xl text-[12px] leading-relaxed text-floodlight-dim">
        Measured on tips we settled against real scorelines — never a strike rate a provider
        claims for itself. A provider&apos;s picks stay tracked but unpublished until it has{" "}
        {MIN_SETTLED_TIPS} settled tips at {MIN_WIN_RATE}% or better, and stop publishing again if
        its record falls back below that.
      </p>

      <ul className="grid gap-3">
        {records.map((record) => (
          <li
            key={record.name}
            className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-line bg-charcoal-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-bold">{record.name}</p>
              <p className="mt-0.5 text-[12px] text-floodlight-dim">{record.status}</p>
              <p className="mt-1 font-mono text-[11px] text-floodlight-faint">
                {record.won}W {record.lost}L {record.void}V · {record.pending} pending
              </p>
            </div>

            <div className="text-right">
              <p className="font-mono text-2xl font-bold">
                {record.winRate === null ? "—" : `${record.winRate}%`}
              </p>
              <span
                className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  record.qualified
                    ? "bg-[rgba(34,201,116,0.14)] text-pitch-bright"
                    : "bg-charcoal text-floodlight-faint"
                }`}
              >
                {record.qualified ? "Publishing" : "Tracking"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
