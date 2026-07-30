import { NextResponse } from "next/server";
import { cloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireRole } from "@/lib/auth-helpers";
import { AuthorizationError } from "@/lib/errors";

// Mongoose and the Cloudinary SDK both need Node APIs.
export const runtime = "nodejs";

/**
 * Signs a direct browser→Cloudinary upload.
 *
 * Signed rather than an unsigned preset: an unsigned preset name sitting in client
 * JS lets anyone upload to the account. Here the signature is only issued to a
 * signed-in staff member, while the file bytes still go straight to Cloudinary
 * rather than through this server.
 */
export async function POST(request: Request) {
  try {
    await requireRole();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }
    throw error;
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured. Add all three credentials to .env.local." },
      { status: 503 },
    );
  }

  let paramsToSign: Record<string, string>;
  try {
    const body = (await request.json()) as { paramsToSign?: Record<string, string> };
    if (!body.paramsToSign || typeof body.paramsToSign !== "object") {
      return NextResponse.json({ error: "Missing paramsToSign." }, { status: 400 });
    }
    paramsToSign = body.paramsToSign;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Non-null is safe: isCloudinaryConfigured() above already rejected a missing secret.
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return NextResponse.json({ signature });
}
