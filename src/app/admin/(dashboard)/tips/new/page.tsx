import { requireRole } from "@/lib/auth-helpers";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { TipForm } from "../tip-form";

export default async function NewTipPage() {
  await requireRole();

  // Default to roughly the next round of evening fixtures rather than "now",
  // which is never a real kick-off time.
  const suggested = new Date();
  suggested.setHours(suggested.getHours() + 3, 0, 0, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New tip" description="Published on the homepage and the tips page." />
      <TipForm defaultKickoffAt={toDateTimeLocal(suggested)} />
    </div>
  );
}
