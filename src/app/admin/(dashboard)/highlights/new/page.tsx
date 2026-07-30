import { requireRole } from "@/lib/auth-helpers";
import { toDateTimeLocal } from "@/lib/schemas/shared";
import { PageHeader } from "@/components/admin/page-header";
import { HighlightForm } from "../highlight-form";

export default async function NewHighlightPage() {
  await requireRole();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="New highlight" description="Upload a clip and give it a title." />
      <HighlightForm defaultPublishedAt={toDateTimeLocal(new Date())} />
    </div>
  );
}
