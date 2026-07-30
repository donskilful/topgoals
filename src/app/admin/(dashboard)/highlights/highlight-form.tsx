"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createHighlight, updateHighlight } from "@/lib/actions/highlights";
import { EMPTY_FORM_STATE } from "@/lib/form-state";
import type { Media } from "@/lib/schemas/shared";
import { FormAlert, SubmitButton, TextField } from "@/components/form-fields";
import { MediaUpload } from "@/components/admin/media-upload";

export type HighlightFormValues = {
  id: string;
  title: string;
  duration: string;
  publishedAt: string;
  video: Media | null;
  thumbnail: Media | null;
};

export function HighlightForm({
  highlight,
  defaultPublishedAt,
}: {
  highlight?: HighlightFormValues;
  defaultPublishedAt: string;
}) {
  const isEdit = Boolean(highlight);
  const [state, formAction] = useActionState(
    isEdit ? updateHighlight : createHighlight,
    EMPTY_FORM_STATE,
  );

  // Prefer what the user just submitted over the stored value: React clears
  // uncontrolled inputs after a form action, so without this a validation error
  // would discard everything they typed.
  const v = (field: string, fallback?: string | number) =>
    state.values[field] ?? (fallback === undefined ? undefined : String(fallback));

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      {isEdit ? <input type="hidden" name="id" value={highlight!.id} /> : null}

      <FormAlert state={state} />

      <TextField
        name="title"
        label="Title"
        required
        defaultValue={v("title", highlight?.title)}
        error={state.fieldErrors.title}
        placeholder="Haaland's hat-trick vs Everton"
      />

      <TextField
        name="duration"
        label="Length"
        required
        defaultValue={v("duration", highlight?.duration)}
        error={state.fieldErrors.duration}
        placeholder="2:14"
        hint="Minutes and seconds, e.g. 2:14."
      />

      <MediaUpload
        name="video"
        label="Video clip"
        resourceType="video"
        initial={highlight?.video ?? null}
        error={state.fieldErrors.video}
        hint="Up to 200MB. Cloudinary handles the streaming formats."
      />

      <MediaUpload
        name="thumbnail"
        label="Thumbnail"
        resourceType="image"
        initial={highlight?.thumbnail ?? null}
        error={state.fieldErrors.thumbnail}
        hint="Optional — shown before the clip plays."
      />

      <TextField
        name="publishedAt"
        label="Published"
        type="datetime-local"
        required
        defaultValue={v("publishedAt", highlight?.publishedAt ?? defaultPublishedAt)}
        error={state.fieldErrors.publishedAt}
      />

      <div className="mt-2 flex items-center gap-3">
        <SubmitButton>{isEdit ? "Save changes" : "Publish highlight"}</SubmitButton>
        <Link
          href="/admin/highlights"
          className="text-[13px] font-semibold text-floodlight-dim hover:text-floodlight"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
