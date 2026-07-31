"use client";

import { useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import type { Media } from "@/lib/schemas/shared";

type MediaUploadProps = {
  /** Hidden input name — the action parses this as JSON. */
  name: string;
  label: string;
  hint?: string;
  error?: string;
  resourceType?: "image" | "video";
  initial?: Media | null;
  /**
   * Called after a successful upload with anything Cloudinary reported about the asset
   * beyond its URL. Used by the highlight form to fill the length field from the video
   * itself instead of asking an editor to time the clip by hand.
   */
  onUploaded?: (media: Media, meta: { durationSeconds?: number }) => void;
};

/**
 * Uploads straight from the browser to Cloudinary using a server-issued signature,
 * then stores the returned URL and public id in a hidden input for the Server
 * Action to read. The file bytes never pass through our server.
 */
export function MediaUpload({
  name,
  label,
  hint,
  error,
  resourceType = "image",
  initial = null,
  onUploaded,
}: MediaUploadProps) {
  const [media, setMedia] = useState<Media | null>(initial);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Both are needed before rendering the widget — it throws on mount if either is
  // missing, which would take the whole form down rather than degrading.
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  );
  const shownError = error ?? uploadError;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-floodlight-dim">
        {label}
      </span>

      <input type="hidden" name={name} value={media ? JSON.stringify(media) : ""} />

      <div className="flex items-center gap-3 rounded-lg border border-line bg-charcoal-2 p-3">
        {media ? (
          resourceType === "video" ? (
            <video
              src={media.secureUrl}
              className="h-16 w-24 flex-none rounded border border-line object-cover"
              muted
            />
          ) : (
            // Cloudinary URLs are remote and arbitrary; next/image would need each
            // hostname allow-listed, so a plain img is the pragmatic choice here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.secureUrl}
              alt=""
              className="h-16 w-24 flex-none rounded border border-line object-cover"
            />
          )
        ) : (
          <div className="flex h-16 w-24 flex-none items-center justify-center rounded border border-dashed border-line text-[10px] uppercase tracking-wide text-floodlight-faint">
            None
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {configured ? (
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              options={{
                sources: ["local", "url"],
                resourceType,
                multiple: false,
                folder: `topgoals/${resourceType}s`,
                maxFileSize: resourceType === "video" ? 200_000_000 : 10_000_000,
              }}
              onSuccess={(result) => {
                const info = result.info;
                if (!info || typeof info === "string") return;

                setUploadError(null);
                const uploaded = { secureUrl: info.secure_url, publicId: info.public_id };
                setMedia(uploaded);

                /**
                 * Cloudinary returns `duration` (in seconds, fractional) for video assets.
                 * It isn't in the widget's published result type, so it's read defensively
                 * — and it's absent for images and for some URL-sourced uploads, in which
                 * case the caller keeps whatever it had.
                 */
                const duration = (info as { duration?: unknown }).duration;

                onUploaded?.(uploaded, {
                  durationSeconds:
                    typeof duration === "number" && Number.isFinite(duration) && duration > 0
                      ? duration
                      : undefined,
                });
              }}
              onError={() => setUploadError("Upload failed. Check your connection and try again.")}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="self-start rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-floodlight transition-colors hover:border-floodlight-faint hover:bg-charcoal-3"
                >
                  {media ? `Replace ${resourceType}` : `Upload ${resourceType}`}
                </button>
              )}
            </CldUploadWidget>
          ) : (
            <p className="text-[11px] text-floodlight-faint">
              Cloudinary isn&apos;t configured yet — add the credentials to{" "}
              <code className="text-floodlight-dim">.env.local</code> to enable uploads.
            </p>
          )}

          {media ? (
            <button
              type="button"
              onClick={() => setMedia(null)}
              className="self-start text-[11px] font-semibold text-whistle hover:underline"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>

      {hint && !shownError ? <p className="text-[11px] text-floodlight-faint">{hint}</p> : null}
      {shownError ? <p className="text-[11px] font-semibold text-whistle">{shownError}</p> : null}
    </div>
  );
}
