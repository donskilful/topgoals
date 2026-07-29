"use client";

import { useActionState } from "react";
import { deleteMessage, toggleMessageHandled } from "@/lib/actions/contact";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { DeleteButton } from "@/components/form-fields";
import { useFormStatus } from "react-dom";

function ToggleButton({ handled }: { handled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
        handled
          ? "border-line text-floodlight-dim hover:border-floodlight-faint hover:text-floodlight"
          : "border-[rgba(34,201,116,0.35)] text-pitch-bright hover:bg-[rgba(34,201,116,0.12)]"
      }`}
    >
      {pending ? "Saving…" : handled ? "Reopen" : "Mark handled"}
    </button>
  );
}

export function MessageActions({
  id,
  handled,
  from,
}: {
  id: string;
  handled: boolean;
  from: string;
}) {
  const [toggleState, toggleAction] = useActionState(toggleMessageHandled, EMPTY_FORM_STATE);
  const [deleteState, deleteAction] = useActionState(deleteMessage, EMPTY_FORM_STATE);

  const error =
    (!toggleState.ok && toggleState.message) || (!deleteState.ok && deleteState.message) || null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <form action={toggleAction}>
          <input type="hidden" name="id" value={id} />
          <ToggleButton handled={handled} />
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="id" value={id} />
          <DeleteButton confirmMessage={`Delete the message from ${from}? This cannot be undone.`} />
        </form>
      </div>

      {error ? (
        <span role="alert" className="text-[11px] font-semibold text-whistle">
          {error}
        </span>
      ) : null}
    </div>
  );
}
