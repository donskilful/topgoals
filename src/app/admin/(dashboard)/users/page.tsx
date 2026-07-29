import Link from "next/link";
import { requireAdminOrRedirect } from "@/lib/auth-helpers";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import type { UserRole } from "@/lib/constants";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteUserForm } from "./delete-user-form";

const ROLE_BADGES: Record<UserRole, string> = {
  admin: "bg-[rgba(245,185,66,0.14)] text-torch",
  moderator: "bg-[rgba(34,201,116,0.14)] text-pitch-bright",
  user: "bg-charcoal-3 text-floodlight-dim",
};

export default async function UsersPage() {
  const actor = await requireAdminOrRedirect();
  await dbConnect();

  const users = await User.find().sort({ role: 1, createdAt: 1 }).lean();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Staff"
        description="Accounts that can sign in to the CMS. Only administrators can manage this list."
        action={{ label: "New account", href: "/admin/users/new" }}
      />

      <div className="overflow-x-auto rounded-xl border border-line bg-charcoal">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              {["Name", "Email", "Role", ""].map((heading) => (
                <th
                  key={heading}
                  className="border-b border-line px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-floodlight-faint"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => {
              const isSelf = String(user._id) === actor.id;
              const border = i === users.length - 1 ? "" : "border-b border-line";

              return (
                <tr key={String(user._id)}>
                  <td className={`px-4 py-3 font-semibold ${border}`}>
                    {user.name}
                    {isSelf ? (
                      <span className="ml-2 font-mono text-[10px] uppercase text-floodlight-faint">
                        you
                      </span>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-floodlight-dim ${border}`}>{user.email}</td>
                  <td className={`px-4 py-3 ${border}`}>
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide ${ROLE_BADGES[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${border}`}>
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/admin/users/${String(user._id)}/edit`}
                        className="text-xs font-bold text-pitch-bright hover:underline"
                      >
                        Edit
                      </Link>
                      {isSelf ? null : (
                        <DeleteUserForm id={String(user._id)} email={user.email} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
