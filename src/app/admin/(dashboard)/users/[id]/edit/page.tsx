import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requireAdminOrRedirect } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "../../user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrRedirect();
  const { id } = await params;

  // A malformed id would otherwise make Mongoose throw a CastError instead of 404.
  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const user = await User.findById(id).lean();
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Edit account" description={user.email} />
      <UserForm
        user={{
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        }}
      />
    </div>
  );
}
