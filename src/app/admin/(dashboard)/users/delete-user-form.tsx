"use client";

import { useActionState } from "react";
import { deleteUser } from "@/lib/actions/users";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { DeleteButton } from "@/components/form-fields";

export function DeleteUserForm({ id, email }: { id: string; email: string }) {
  const [state, formAction] = useActionState(deleteUser, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <DeleteButton confirmMessage={`Delete the account for ${email}? This cannot be undone.`} />
      {state.message && !state.ok ? (
        <span role="alert" className="text-[11px] font-semibold text-whistle">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
