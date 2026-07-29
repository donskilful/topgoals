import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireRole } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { Tip } from "@/lib/models/tip";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { TipForm } from "../../tip-form";

export default async function EditTipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole();
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const tip = await Tip.findById(id).lean();
  if (!tip) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Edit tip" description={tip.fixture} />
      <TipForm
        defaultKickoffAt={toDateTimeLocal(tip.kickoffAt)}
        tip={{
          id: String(tip._id),
          competition: tip.competition,
          fixture: tip.fixture,
          pick: tip.pick,
          odds: tip.odds,
          confidence: tip.confidence,
          kickoffAt: toDateTimeLocal(tip.kickoffAt),
          result: tip.result,
        }}
      />
    </div>
  );
}
