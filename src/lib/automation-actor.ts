import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";
import { UNUSABLE_PASSWORD_HASH } from "@/lib/constants";
import type { SessionActor } from "@/lib/auth-helpers";

/**
 * The identity automated writes are attributed to.
 *
 * The audit log requires an actor on every entry, and it should stay truthful: an
 * article the news pipeline published was not written by whichever admin happened to
 * be logged in. So automation gets its own account, and the activity log reads
 * "TopGoals Automation created article …" — which is exactly what happened.
 *
 * The account cannot be signed into. Its role is `user` (never admitted to the CMS)
 * and its password hash is the sentinel below, which no bcrypt comparison can match
 * and which `authorize()` rejects outright.
 */

export const AUTOMATION_EMAIL = "automation@topgoals.local";
export const AUTOMATION_NAME = "TopGoals Automation";

/**
 * Finds or creates the automation account and returns it as an audit actor.
 *
 * Upsert rather than a seed-script dependency: the cron job must work on a fresh
 * deployment where nobody has run the seed, and creating it lazily costs one indexed
 * lookup per run.
 */
export async function getAutomationActor(): Promise<SessionActor> {
  await dbConnect();

  const account = await User.findOneAndUpdate(
    { email: AUTOMATION_EMAIL },
    {
      $setOnInsert: {
        name: AUTOMATION_NAME,
        email: AUTOMATION_EMAIL,
        passwordHash: UNUSABLE_PASSWORD_HASH,
        role: "user",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  if (!account) {
    // findOneAndUpdate with upsert+new always returns a document; this is here so the
    // type narrows without a non-null assertion.
    throw new Error("Could not resolve the automation account.");
  }

  return {
    id: String(account._id),
    name: account.name,
    email: account.email,
    role: account.role,
  };
}
