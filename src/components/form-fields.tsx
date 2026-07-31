"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/**
 * Destructive submit used by every delete form, guarded by a real confirmation dialog.
 *
 * Built on the native `<dialog>` element rather than a hand-rolled overlay, which gets the
 * things that are easy to botch for free: focus is trapped inside while open, Escape closes
 * it, the backdrop is inert, and it renders in the browser's top layer so it can never be
 * clipped by a table's `overflow` or lose a z-index fight.
 *
 * The dialog sits *inside* the form, so the confirm button is an ordinary submit and the
 * Server Action wiring is untouched — `showModal()` promotes it visually without moving it in
 * the DOM, so form association survives.
 *
 * Cancel takes focus on open. For a destructive action the safe option should be the one
 * under a stray Enter or Space.
 */
export function DeleteButton({
  confirmMessage,
  label = "Delete",
  confirmLabel = "Delete",
}: {
  confirmMessage: string;
  label?: string;
  confirmLabel?: string;
}) {
  const { pending } = useFormStatus();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const messageId = useId();

  // Driven from state rather than called inline so Escape (which closes the dialog without
  // going through our handlers) can't leave `open` out of step with what's on screen.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[rgba(255,71,87,0.35)] px-3 py-1.5 text-xs font-bold text-whistle transition-colors hover:bg-[rgba(255,71,87,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Deleting…" : label}
      </button>

      {/*
        The dialog fills the viewport and the visible card is a child of it.
        
        Sized to its content instead, clicks outside the card land on the `::backdrop`
        pseudo-element and never reach the dialog's own click handler — so dismiss-on-outside-
        click silently did nothing. Filling the viewport makes those clicks land on a real
        element, and the panel ref below decides what counts as "outside".
      */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
            setOpen(false);
          }
        }}
        className="fixed inset-0 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center overflow-y-auto bg-transparent p-4 backdrop:bg-[rgba(5,8,7,0.72)] backdrop:backdrop-blur-sm"
      >
        <div
          ref={panelRef}
          className="w-full max-w-sm rounded-xl border border-line bg-charcoal text-floodlight shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
        >
          <div className="flex flex-col gap-3 p-5">
            <h2 id={titleId} className="font-display text-lg font-normal uppercase tracking-wide">
              Confirm delete
            </h2>

            <p id={messageId} className="text-[13px] leading-relaxed text-floodlight-dim">
              {confirmMessage}
            </p>

            <div className="mt-1 flex justify-end gap-2">
              <button
                type="button"
                // Deliberate: in a destructive dialog the non-destructive option should be
                // the one holding focus, so a stray Enter cancels rather than deletes.
                autoFocus
                onClick={() => setOpen(false)}
                className="rounded-lg border border-line px-3 py-2 text-xs font-bold text-floodlight-dim transition-colors hover:border-floodlight-faint hover:bg-charcoal-2 hover:text-floodlight"
              >
                Cancel
              </button>

              {/* An ordinary submit for the enclosing form — this is what runs the action. */}
              <button
                type="submit"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-whistle px-3 py-2 text-xs font-extrabold text-floodlight transition-colors hover:bg-[#ff6b78]"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
