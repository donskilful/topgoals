import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary client. The API secret must never reach the browser, so
 * this module must not be imported from a Client Component — uploads happen via
 * the signed-upload widget, which calls /api/cloudinary/sign for a signature.
 *
 * Cloud name and API key are read from their NEXT_PUBLIC_ variables rather than
 * separate server-side copies. The upload widget needs both in the browser anyway
 * (they aren't secrets — only the secret is), and keeping one variable per value
 * avoids the two drifting apart.
 */
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/** True when all three Cloudinary variables are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
      process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Removes an asset from Cloudinary. Called whenever a media field is replaced or
 * its owning document is deleted, so unreferenced files don't accumulate and eat
 * the storage quota.
 *
 * Deliberately never throws: losing an orphaned file is far less bad than failing
 * a content update the user has already committed to.
 */
export async function destroyAsset(
  publicId: string | null | undefined,
  resourceType: "image" | "video" = "image",
): Promise<void> {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error(`Failed to delete Cloudinary asset "${publicId}":`, error);
  }
}
