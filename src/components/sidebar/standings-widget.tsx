import Link from "next/link";
import { standings } from "@/lib/mock-data";

export function StandingsWidget() {
  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="font-display text-[15px] font-normal uppercase tracking-wide">Standings</h4>
        <Link href="#" className="text-xs font-bold text-pitch-bright hover:underline">
          Full table →
        </Link>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="border-b border-line px-1 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">
              #
            </th>
            <th className="border-b border-line px-1 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">
              Team
            </th>
            <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">
              P
            </th>
            <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">
              GD
            </th>
            <th className="border-b border-line px-1 py-2 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-floodlight-faint">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.pos}>
              <td
                className={`px-1 py-2 font-mono ${i === standings.length - 1 ? "" : "border-b border-line"} ${
                  row.qualifying ? "text-pitch-bright" : "text-floodlight-faint"
                }`}
              >
                {row.pos}
              </td>
              <td className={`px-1 py-2 ${i === standings.length - 1 ? "" : "border-b border-line"}`}>
                {row.team}
              </td>
              <td
                className={`px-1 py-2 text-center font-mono ${i === standings.length - 1 ? "" : "border-b border-line"}`}
              >
                {row.played}
              </td>
              <td
                className={`px-1 py-2 text-center font-mono ${i === standings.length - 1 ? "" : "border-b border-line"}`}
              >
                {row.gd}
              </td>
              <td
                className={`px-1 py-2 text-center font-mono font-extrabold ${i === standings.length - 1 ? "" : "border-b border-line"}`}
              >
                {row.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
