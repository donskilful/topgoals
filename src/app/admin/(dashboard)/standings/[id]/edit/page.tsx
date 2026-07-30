import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { StandingRow } from "@/lib/models/standing-row";
import { PageHeader } from "@/components/admin/page-header";
import { StandingForm } from "../../standing-form";

export default async function EditStandingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const row = await StandingRow.findById(id).lean();
  if (!row) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit table row" description={row.team} />
      <StandingForm
        row={{
          id: String(row._id),
          competition: row.competition,
          pos: row.pos,
          team: row.team,
          played: row.played,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          points: row.points,
          qualifying: row.qualifying,
        }}
      />
    </div>
  );
}
