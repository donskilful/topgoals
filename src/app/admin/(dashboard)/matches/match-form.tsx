"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createMatch, updateMatch } from "@/lib/actions/matches";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { NO_SCORE } from "@/lib/constants";
import { FormAlert, SelectField, SubmitButton, TextField } from "@/components/form-fields";

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming — not started" },
  { value: "live", label: "Live — in progress" },
  { value: "finished", label: "Finished" },
];

/** Suggested status line per state, so the field isn't a blank guess. */
const META_PLACEHOLDER: Record<string, string> = {
  upcoming: "Today 20:00",
  live: "76'",
  finished: "FT",
};

export type MatchFormValues = {
  id: string;
  competition: string;
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  status: string;
  meta: string;
  kickoffAt: string;
};

export function MatchForm({
  match,
  defaultKickoffAt,
}: {
  match?: MatchFormValues;
  defaultKickoffAt: string;
}) {
  const isEdit = Boolean(match);
  const [state, formAction] = useActionState(isEdit ? updateMatch : createMatch, EMPTY_FORM_STATE);

  // Prefer what the user just submitted over the stored value: React clears
  // uncontrolled inputs after a form action, so without this a validation error
  // would discard everything they typed.
  const v = (field: string, fallback?: string | number) =>
    state.values[field] ?? (fallback === undefined ? undefined : String(fallback));
  const [status, setStatus] = useState(match?.status ?? "upcoming");

  // The en dash placeholder is what the DB stores pre-kickoff; show it as empty.
  const scoreValue = (value?: string) => (value && value !== NO_SCORE ? value : "");

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={match!.id} /> : null}

      <FormAlert state={state} />

      <TextField
        name="competition"
        label="Competition"
        required
        defaultValue={v("competition", match?.competition)}
        error={state.fieldErrors.competition}
        placeholder="Premier League"
      />

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <TextField
          name="home"
          label="Home team"
          required
          defaultValue={v("home", match?.home)}
          error={state.fieldErrors.home}
          placeholder="Arsenal"
        />
        <TextField
          name="homeScore"
          label="Score"
          inputMode="numeric"
          defaultValue={v("homeScore", scoreValue(match?.homeScore))}
          error={state.fieldErrors.homeScore}
        />
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <TextField
          name="away"
          label="Away team"
          required
          defaultValue={v("away", match?.away)}
          error={state.fieldErrors.away}
          placeholder="Chelsea"
        />
        <TextField
          name="awayScore"
          label="Score"
          inputMode="numeric"
          defaultValue={v("awayScore", scoreValue(match?.awayScore))}
          error={state.fieldErrors.awayScore}
        />
      </div>

      <SelectField
        name="status"
        label="Status"
        required
        value={status}
        onChange={(event) => setStatus(event.currentTarget.value)}
        options={STATUS_OPTIONS}
        error={state.fieldErrors.status}
      />

      <TextField
        name="meta"
        label="Status line"
        required
        defaultValue={v("meta", match?.meta)}
        error={state.fieldErrors.meta}
        placeholder={META_PLACEHOLDER[status]}
        hint="Exactly what appears on the card. There's no live feed yet, so update this by hand as the match progresses."
      />

      <TextField
        name="kickoffAt"
        label="Kick-off"
        type="datetime-local"
        required
        defaultValue={v("kickoffAt", match?.kickoffAt ?? defaultKickoffAt)}
        error={state.fieldErrors.kickoffAt}
        hint="Used for ordering the ticker."
      />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Add match"}</SubmitButton>
        <Link
          href="/admin/matches"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
