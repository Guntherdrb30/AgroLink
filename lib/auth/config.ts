import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { prisma } from "@/lib/db/prisma";
import { loginSchema } from "@/lib/validators/auth";
import { authenticateWithCredentials } from "@/server/services/auth-service";
import { recordAccessAudit } from "@/server/services/access-audit-service";
import {
  findUserAuthContextById,
  findUserByEmail,
  touchUserEmailVerified,
} from "@/server/repositories/user-repository";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);

      if (!parsed.success) {
        return null;
      }

      return authenticateWithCredentials(parsed.data);
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        const email = (user.email ?? profile?.email)?.trim().toLowerCase();

        if (!email) {
          return "/login?error=google_email_missing";
        }

        const existingUser = await findUserByEmail(email);

        if (!existingUser) {
          await recordAccessAudit({
            action: "GOOGLE_LOGIN_REJECTED",
            email,
            provider: "google",
            metadata: { reason: "no_registered_user" },
          });

          return "/login?error=google_account_not_linked";
        }

        await touchUserEmailVerified(existingUser.id);
        await recordAccessAudit({
          action: "LOGIN_SUCCESS",
          userId: existingUser.id,
          tenantId: existingUser.defaultTenantId,
          email,
          provider: "google",
        });

        return true;
      }

      if (account?.provider === "credentials" && user.email) {
        await recordAccessAudit({
          action: "LOGIN_SUCCESS",
          userId: user.id,
          tenantId: user.defaultTenantId,
          email: user.email,
          provider: "credentials",
        });
      }

      return true;
    },
    async jwt({ token, user }) {
      const userId =
        typeof user?.id === "string"
          ? user.id
          : typeof token.sub === "string"
            ? token.sub
            : undefined;

      if (!userId) {
        return token;
      }

      const dbUser = await findUserAuthContextById(userId);

      if (!dbUser) {
        return token;
      }

      const defaultMembership =
        dbUser.memberships.find((membership) => membership.isDefault) ??
        dbUser.memberships.find(
          (membership) => membership.tenantId === dbUser.defaultTenantId,
        ) ??
        dbUser.memberships[0];

      token.sub = dbUser.id;
      token.id = dbUser.id;
      token.name = dbUser.name;
      token.email = dbUser.email;
      token.platformRole = dbUser.platformRole ?? undefined;
      token.defaultTenantId =
        dbUser.defaultTenantId ?? defaultMembership?.tenantId ?? undefined;
      token.tenantRole =
        (dbUser.defaultTenantId
          ? dbUser.memberships.find(
              (membership) => membership.tenantId === dbUser.defaultTenantId,
            )?.role
          : defaultMembership?.role) ?? undefined;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.platformRole =
          typeof token.platformRole === "string" ? token.platformRole : undefined;
        session.user.defaultTenantId =
          typeof token.defaultTenantId === "string"
            ? token.defaultTenantId
            : undefined;
        session.user.tenantRole =
          typeof token.tenantRole === "string" ? token.tenantRole : undefined;
      }

      return session;
    },
  },
};
