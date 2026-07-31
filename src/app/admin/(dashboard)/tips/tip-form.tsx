"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTip, updateTip } from "@/lib/actions/tips";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import {
  FormAlert,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/form-fields";

const CONFIDENCE_OPTIONS = [
  { value: "1", label: "1 — Speculative" },
  { value: "2", label: "2 — Reasonable" },
  { value: "3", label: "3 — Strong" },
  { value: "4", label: "4 — Best bet" },
];

const RESULT_OPTIONS = [
  { value: "pending", label: "Pending — not settled yet" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "void", label: "Void / push" },
];

export type TipFormValues = {
  id: string;
  competition: string;
  fixture: string;
  pick: string;
  // Nullable: a tip ingested from a provider carries neither, and the form shows the
  // field empty rather than pre-filling a price nobody quoted.
  odds: string | null;
  confidence: number | null;
  kickoffAt: string;
  result: string;
};

export function TipForm({
  tip,
  defaultKickoffAt,
}: {
  tip?: TipFormValues;
  defaultKickoffAt: string;
}) {
  const isEdit = Boolean(tip);
  const [state, formAction] = useActionState(isEdit ? updateTip : createTip, EMPTY_FORM_STATE);

  // Prefer what the user just submitted over the stored value: React clears
  // uncontrolled inputs after a form action, so without this a validation error
  // would discard everything they typed.
  const v = (field: string, fallback?: string | number) =>
    state.values[field] ?? (fallback === undefined ? undefined : String(fallback));

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={tip!.id} /> : null}

      <FormAlert state={state} />

      <TextField
        name="competition"
        label="Competition"
        required
        defaultValue={v("competition", tip?.competition)}
        error={state.fieldErrors.competition}
        placeholder="Premier League"
      />

      <TextField
        name="fixture"
        label="Fixture"
        required
        defaultValue={v("fixture", tip?.fixture)}
        error={state.fieldErrors.fixture}
        placeholder="Man United vs Liverpool"
      />

      <TextField
        name="pick"
        label="Selection"
        required
        defaultValue={v("pick", tip?.pick)}
        error={state.fieldErrors.pick}
        placeholder="Over 2.5 Goals"
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="odds"
          label="Odds"
          required
          inputMode="decimal"
          defaultValue={v("odds", tip?.odds ?? "")}
          error={state.fieldErrors.odds}
          placeholder="1.85"
        />
        <SelectField
          name="confidence"
          label="Confidence"
          required
          defaultValue={v("confidence", String(tip?.confidence ?? 3))}
          options={CONFIDENCE_OPTIONS}
          error={state.fieldErrors.confidence}
        />
      </div>

      <TextField
        name="kickoffAt"
        label="Kick-off"
        type="datetime-local"
        required
        defaultValue={v("kickoffAt", tip?.kickoffAt ?? defaultKickoffAt)}
        error={state.fieldErrors.kickoffAt}
      />

      <SelectField
        name="result"
        label="Result"
        required
        defaultValue={v("result", tip?.result ?? "pending")}
        options={RESULT_OPTIONS}
        error={state.fieldErrors.result}
        hint="Settle this after the match — the published win rate is calculated from results."
      />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Publish tip"}</SubmitButton>
        <Link
          href="/admin/tips"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
