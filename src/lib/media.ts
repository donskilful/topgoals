/**
 * Cloudinary URL helpers. Pure string work — no SDK, no request, safe anywhere.
 */

/**
 * A still frame from an uploaded video, for use as a poster image.
 *
 * Cloudinary will render any video as an image if you ask for an image extension, so a
 * thumbnail doesn't need uploading separately — it's the same asset viewed differently.
 * `so_auto` ("start offset: auto") picks the frame Cloudinary judges most representative
 * rather than grabbing frame zero, which on football footage is often a blurry pan or a
 * blank pre-roll.
 *
 * Transformations go between `/upload/` and the version segment, and the extension is
 * swapped for `.jpg`:
 *
 *   .../video/upload/v1234/topgoals/videos/clip.mp4
 *   .../video/upload/so_auto,f_jpg,q_auto/v1234/topgoals/videos/clip.jpg
 *
 * Returns null for anything that isn't a Cloudinary video URL, so callers fall back to
 * whatever placeholder they already had rather than rendering a broken image.
 */
export function videoPosterUrl(secureUrl: string | null | undefined): string | null {
  if (!secureUrl) return null;

  // Only Cloudinary video delivery URLs can be transformed this way.
  if (!secureUrl.includes("/video/upload/")) return null;

  const withTransform = secureUrl.replace(
    "/video/upload/",
    "/video/upload/so_auto,f_jpg,q_auto/",
  );

  // Swap a trailing file extension for .jpg; append it if the URL had none.
  return /\.[a-z0-9]{2,5}$/i.test(withTransform)
    ? withTransform.replace(/\.[a-z0-9]{2,5}$/i, ".jpg")
    : `${withTransform}.jpg`;
}
