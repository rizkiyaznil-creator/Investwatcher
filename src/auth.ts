import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Comma-separated allowlist of emails permitted to sign in (owner-only mode). */
const allowed = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    // Only allow listed emails. If the allowlist is empty, allow anyone who
    // signs in (useful before the owner finishes configuring it).
    async signIn({ user }) {
      if (allowed.length === 0) return true;
      const email = user.email?.toLowerCase();
      return !!email && allowed.includes(email);
    },
  },
});
