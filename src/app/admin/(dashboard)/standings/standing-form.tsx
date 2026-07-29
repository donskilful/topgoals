"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createStandingRow, updateStandingRow } from "@/lib/actions/standings";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { DEFAULT_COMPETITION } from "@/lib/constants";
import {
  CheckboxField,
  FormAlert,
  SubmitButton,
  TextField,
} from "@/components/form-fields";

export type StandingFormValues = {
  id: string;
  competition: string;
  pos: number;
  team: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  qualifying: boolean;
};

export function StandingForm({ row }: { row?: StandingFormValues }) {
  const isEdit = Boolean(row);
  const [state, formAction] = useActionState(
    isEdit ? updateStandingRow : createStandingRow,
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={row!.id} /> : null}

      <FormAlert state={state} />

      <TextField
        name="competition"
        label="Competition"
        required
        defaultValue={row?.competition ?? DEFAULT_COMPETITION}
        error={state.fieldErrors.competition}
      />

      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <TextField
          name="pos"
          label="Position"
          required
          inputMode="numeric"
          defaultValue={row?.pos}
          error={state.fieldErrors.pos}
        />
        <TextField
          name="team"
          label="Team"
          required
          defaultValue={row?.team}
          error={state.fieldErrors.team}
          placeholder="Liverpool"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          name="played"
          label="Played"
          required
          inputMode="numeric"
          defaultValue={row?.played}
          error={state.fieldErrors.played}
        />
        <TextField
          name="points"
          label="Points"
          required
          inputMode="numeric"
          defaultValue={row?.points}
          error={state.fieldErrors.points}
        />
        <TextField
          name="goalsFor"
          label="Goals for"
          required
          inputMode="numeric"
          defaultValue={row?.goalsFor}
          error={state.fieldErrors.goalsFor}
        />
        <TextField
          name="goalsAgainst"
          label="Goals against"
          required
          inputMode="numeric"
          defaultValue={row?.goalsAgainst}
          error={state.fieldErrors.goalsAgainst}
        />
      </div>

      <p className="-mt-1 text-[11px] text-floodlight-faint">
        Goal difference is worked out from these two numbers, so it can never disagree with them.
      </p>

      <CheckboxField
        name="qualifying"
        label="European qualification place"
        defaultChecked={row?.qualifying ?? false}
        hint="Shows the position number in green on the public table."
      />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add to table"}</SubmitButton>
        <Link
          href="/admin/standings"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
