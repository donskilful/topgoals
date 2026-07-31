"use client";

import { useActionState, useState } from "react";
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

  /**
   * Length is controlled so uploading a clip can fill it in.
   *
   * Still editable: Cloudinary doesn't always report a duration (images, and some
   * URL-sourced uploads), and an editor may want to describe a trimmed section rather than
   * the whole file.
   */
  const [duration, setDuration] = useState(v("duration", highlight?.duration) ?? "");
  const [autoFilled, setAutoFilled] = useState(false);

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

      {/* Upload first: the clip fills in the length below. */}
      <MediaUpload
        name="video"
        label="Video clip"
        resourceType="video"
        initial={highlight?.video ?? null}
        error={state.fieldErrors.video}
        hint="Up to 200MB. Cloudinary handles the streaming formats, and reads the length."
        onUploaded={(_media, meta) => {
          if (meta.durationSeconds === undefined) return;

          // Round up: a 133.4s clip is "2:14" to a viewer, not "2:13".
          const total = Math.ceil(meta.durationSeconds);
          const minutes = Math.floor(total / 60);
          const seconds = total % 60;

          setDuration(`${minutes}:${String(seconds).padStart(2, "0")}`);
          setAutoFilled(true);
        }}
      />

      <TextField
        name="duration"
        label="Length"
        required
        value={duration}
        onChange={(event) => {
          setDuration(event.target.value);
          setAutoFilled(false);
        }}
        error={state.fieldErrors.duration}
        placeholder="2:14"
        hint={
          autoFilled
            ? "Read from the uploaded clip — edit it if you're featuring a shorter section."
            : "Minutes and seconds, e.g. 2:14. Filled in automatically when you upload a clip."
        }
      />

      <MediaUpload
        name="thumbnail"
        label="Thumbnail override"
        resourceType="image"
        initial={highlight?.thumbnail ?? null}
        error={state.fieldErrors.thumbnail}
        hint="Optional. Leave empty and a frame from the clip is used automatically."
      />

      <TextField
        name="publishedAt"
        label="Published"
        type="datetime-local"
        required
        defaultValue={v("publishedAt", highlight?.publishedAt ?? defaultPublishedAt)}
        error={state.fieldErrors.publishedAt}
        hint="Defaults to now. Change it only to backdate or schedule a clip."
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
