"use client";

import { useActionState } from "react";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";
import { DeleteButton } from "@/components/admin/form-fields";

type DeleteAction = (prevState: FormState, formData: FormData) => Promise<FormState>;

/**
 * Generic delete control for a table row. Server Actions can be passed across the
 * client boundary as props, so every entity list reuses this rather than defining
 * its own near-identical form.
 */
export function DeleteRowForm({
  action,
  id,
  confirmMessage,
  label,
}: {
  action: DeleteAction;
  id: string;
  confirmMessage: string;
  label?: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <DeleteButton confirmMessage={confirmMessage} label={label} />
      {state.message && !state.ok ? (
        <span role="alert" className="text-[11px] font-semibold text-whistle">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
