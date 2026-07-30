import Link from "next/link";
import { getStandings } from "@/lib/data/standings";

export async function StandingsWidget() {
  const rows = await getStandings();

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-charcoal p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="font-display text-[15px] font-normal uppercase tracking-wide">Standings</h4>
        <Link href="/scores" className="text-xs font-bold text-pitch-bright hover:underline">
          Full table →
        </Link>
      </div>
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
          {rows.map((row, i) => {
            const border = i === rows.length - 1 ? "" : "border-b border-line";
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
