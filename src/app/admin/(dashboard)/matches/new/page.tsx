import { requireRole } from "@/lib/auth-helpers";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { MatchForm } from "../match-form";

export default async function NewMatchPage() {
  await requireRole();

  const suggested = new Date();
  suggested.setHours(suggested.getHours() + 3, 0, 0, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Add match" description="Appears in the homepage live-score ticker." />
      <MatchForm defaultKickoffAt={toDateTimeLocal(suggested)} />
    </div>
  );
}
