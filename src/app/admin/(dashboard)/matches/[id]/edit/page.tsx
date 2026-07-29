import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Match } from "@/lib/models/match";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { MatchForm } from "../../match-form";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const match = await Match.findById(id).lean();
  if (!match) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit match" description={`${match.home} v ${match.away}`} />
      <MatchForm
        defaultKickoffAt={toDateTimeLocal(match.kickoffAt)}
        match={{
          id: String(match._id),
          competition: match.competition,
          home: match.home,
          away: match.away,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          meta: match.meta,
          kickoffAt: toDateTimeLocal(match.kickoffAt),
        }}
      />
    </div>
  );
}
