"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { syncScoresNow } from "@/lib/actions/sync";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/form-state";

function Button({ configured }: { configured: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !configured}
      title={configured ? undefined : "Add FOOTBALL_DATA_API_KEY to enable automatic scores"}
      className="rounded-lg border border-line px-3.5 py-2 text-[13px] font-bold text-floodlight transition-colors hover:border-floodlight-faint hover:bg-charcoal-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Syncing…" : "Sync now"}
    </button>
  );
}

export function SyncButton({ configured }: { configured: boolean }) {
  // The action takes no form data, so adapt it to the useActionState signature.
  const [state, formAction] = useActionState<FormState>(
    () => syncScoresNow(),
    EMPTY_FORM_STATE,
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <form action={formAction}>
        <Button configured={configured} />
      </form>

      {state.message ? (
        <p
          role={state.ok ? "status" : "alert"}
          className={`text-[12px] ${state.ok ? "text-pitch-bright" : "text-whistle"}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
