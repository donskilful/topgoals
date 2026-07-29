import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { dbConnect } from "@/lib/db";
import { User } from "@/lib/models/user";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Full Auth.js config — safe to import from route handlers, Server Components and
 * Server Actions (all Node runtime), but NOT from middleware: the Mongoose and
 * bcrypt imports below cannot run on the edge. See `auth.config.ts`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        await dbConnect();
        // passwordHash is `select: false` on the schema, so ask for it explicitly.
        const user = await User.findOne({ email: email.toLowerCase() })
          .select("+passwordHash")
          .lean();

        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
});
