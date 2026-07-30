import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";

/**
 * Minimum password length for staff accounts. Long rather than complex — length
 * is the property that actually resists brute force, and complexity rules push
 * people toward predictable substitutions.
 */
export const MIN_PASSWORD_LENGTH = 10;

const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(200, "Password is too long.");

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password,
  role: z.enum(USER_ROLES, { message: "Choose a role." }),
});

export const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: z.enum(USER_ROLES, { message: "Choose a role." }),
  // Blank means "leave the current password alone".
  password: z.union([password, z.literal("")]).optional(),
});

export const deleteUserSchema = z.object({ id: z.string().min(1) });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
