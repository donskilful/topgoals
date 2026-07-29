"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form-state";

const CONTROL_CLASSES =
  "w-full rounded-lg border border-line bg-charcoal-2 px-3 py-2.5 text-sm text-floodlight placeholder:text-floodlight-faint disabled:opacity-60";

function FieldShell({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-floodlight-dim">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[11px] text-floodlight-faint">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[11px] font-semibold text-whistle">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  name,
  label,
  error,
  hint,
  type = "text",
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "type" | "id">) {
  return (
    <FieldShell label={label} htmlFor={name} error={error} hint={hint}>
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={CONTROL_CLASSES}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  name,
  label,
  error,
  hint,
  rows = 4,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  rows?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "id" | "rows">) {
  return (
    <FieldShell label={label} htmlFor={name} error={error} hint={hint}>
      <textarea
        id={name}
        name={name}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${CONTROL_CLASSES} resize-y leading-relaxed`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  options,
  ...rest
}: {
  name: string;
  label: string;
  error?: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "id">) {
  return (
    <FieldShell label={label} htmlFor={name} error={error} hint={hint}>
      <select
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={CONTROL_CLASSES}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-charcoal-2">
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  ...rest
}: {
  name: string;
  label: string;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "id" | "type">) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line bg-charcoal-2 p-3">
      <input
        id={name}
        name={name}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--torch)]"
        {...rest}
      />
      <div>
        <label htmlFor={name} className="text-sm font-semibold">
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-[11px] text-floodlight-faint">{hint}</p> : null}
      </div>
    </div>
  );
}

/** Renders the form-level success/failure banner returned by a Server Action. */
export function FormAlert({ state }: { state: FormState }) {
  if (!state.message) return null;

  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`rounded-lg border px-3 py-2.5 text-[13px] ${
        state.ok
          ? "border-[rgba(34,201,116,0.3)] bg-[rgba(34,201,116,0.1)] text-pitch-bright"
          : "border-[rgba(255,71,87,0.3)] bg-[rgba(255,71,87,0.1)] text-whistle"
      }`}
    >
      {state.message}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-torch px-4 py-2.5 text-sm font-extrabold text-ink transition-all hover:bg-[#ffc766] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Destructive submit used by delete forms, with a native confirm() guard. */
export function DeleteButton({
  confirmMessage,
  label = "Delete",
}: {
  confirmMessage: string;
  label?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="rounded-lg border border-[rgba(255,71,87,0.35)] px-3 py-1.5 text-xs font-bold text-whistle transition-colors hover:bg-[rgba(255,71,87,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
