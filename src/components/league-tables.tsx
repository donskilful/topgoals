"use client";

import { useState } from "react";
import type { LeagueTable } from "@/lib/data/standings";

/**
 * League tables with a client-side switcher.
 *
 * A Client Component purely so switching leagues costs nothing: every table arrives in
 * the page's static HTML, so the page is still prerendered and served from the edge, and
 * changing league is instant with no network request. Doing it with a `?league=` param
 * would have made the whole page render per request.
 */
export function LeagueTables({ tables }: { tables: LeagueTable[] }) {
  const [active, setActive] = useState(0);

  if (tables.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-charcoal p-4">
        <h2 className="mb-2 font-display text-[15px] font-normal uppercase tracking-wide">
          League Tables
        </h2>
        <p className="text-[13px] text-floodlight-dim">
          Tables haven&apos;t been set up yet.
        </p>
      </div>
    );
  }

  const table = tables[Math.min(active, tables.length - 1)];

  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <h2 className="mb-3 font-display text-[15px] font-normal uppercase tracking-wide">
        League Tables
      </h2>

      {/* Only worth a switcher when there's more than one table. */}
      {tables.length > 1 ? (
        <div
          role="tablist"
          aria-label="Choose a league"
          className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 pb-1"
        >
          {tables.map((entry, index) => {
            const selected = index === active;
            return (
              <button
                key={entry.competition}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(index)}
                className={`flex-none rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                  selected
                    ? "bg-charcoal-3 text-floodlight"
                    : "text-floodlight-faint hover:text-floodlight-dim"
                }`}
              >
                {entry.competition}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mb-3 font-mono text-[10px] uppercase tracking-wide text-floodlight-faint">
          {table.competition}
        </p>
      )}

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {[
              { label: "#", numeric: false },
              { label: "Team", numeric: false },
              { label: "P", numeric: true },
              { label: "GD", numeric: true },
              { label: "Pts", numeric: true },
            ].map((column) => (
              <th
                key={column.label}
                className={`border-b border-line px-1 py-2 text-[10px] font-bold uppercase tracking-wide text-floodlight-faint ${
                  column.numeric ? "text-center font-mono" : "text-left"
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => {
            const border = i === table.rows.length - 1 ? "" : "border-b border-line";
            return (
              <tr key={row.id}>
                <td
                  className={`px-1 py-2 font-mono ${border} ${
                    row.qualifying ? "text-pitch-bright" : "text-floodlight-faint"
                  }`}
                >
                  {row.pos}
                </td>
                <td className={`px-1 py-2 ${border}`}>{row.team}</td>
                <td className={`px-1 py-2 text-center font-mono ${border}`}>{row.played}</td>
                <td className={`px-1 py-2 text-center font-mono ${border}`}>{row.gd}</td>
                <td className={`px-1 py-2 text-center font-mono font-extrabold ${border}`}>
                  {row.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
