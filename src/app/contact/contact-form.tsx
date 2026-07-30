"use client";

import { useActionState } from "react";
import { submitContactMessage } from "@/lib/actions/contact";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import { MESSAGE_TOPICS } from "@/lib/constants";
import {
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  TextField,
} from "@/components/form-fields";

const TOPIC_OPTIONS = MESSAGE_TOPICS.map((topic) => ({ value: topic, label: topic }));

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, EMPTY_FORM_STATE);

  // Prefer what the user just submitted over the stored value: React clears
  // uncontrolled inputs after a form action, so without this a validation error
  // would discard everything they typed.
  const v = (field: string, fallback?: string | number) =>
    state.values[field] ?? (fallback === undefined ? undefined : String(fallback));

  // On success, replace the form entirely — leaving a filled-in form under a
  // "sent" banner invites people to submit the same thing twice.
  if (state.ok) {
    return (
      <div className="rounded-xl border border-[rgba(34,201,116,0.3)] bg-[rgba(34,201,116,0.08)] p-6">
        <p className="font-display text-lg uppercase tracking-wide text-pitch-bright">
          Message sent
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-floodlight-dim">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          name="name"
          label="Your name"
          required
          error={state.fieldErrors.name}
          autoComplete="name"
        />
        <TextField
          name="email"
          label="Your email"
          type="email"
          required
          error={state.fieldErrors.email}
          autoComplete="email"
          hint="Only used to reply to you."
        />
      </div>

      <SelectField
        name="topic"
        label="What's this about?"
        required
        defaultValue={v("topic", "General enquiry")}
        options={TOPIC_OPTIONS}
        error={state.fieldErrors.topic}
      />

      <TextAreaField
        name="body"
        label="Message"
        required
        rows={7}
        error={state.fieldErrors.body}
        hint="If you're reporting a correction, a link or the fixture involved helps us fix it faster."
      />

      {/* Honeypot: hidden from people, irresistible to naive bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="mt-1">
        <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
      </div>
    </form>
  );
}
