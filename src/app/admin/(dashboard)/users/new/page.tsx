import { requireAdminOrRedirect } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireAdminOrRedirect();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="New account"
        description="Create a CMS account. There is no email invite — set a temporary password and share it directly."
      />
      <UserForm />
    </div>
  );
}
