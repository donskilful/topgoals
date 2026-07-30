import { requireRole } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin/page-header";
import { StandingForm } from "../standing-form";

export default async function NewStandingPage() {
  await requireRole();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Add team" description="Add a row to the league table." />
      <StandingForm />
    </div>
  );
}
