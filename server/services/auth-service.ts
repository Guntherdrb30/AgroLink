import { compare, hash } from "bcryptjs";

import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "@/lib/validators/auth";
import { slugify } from "@/lib/utils/slugify";
import { prisma } from "@/lib/db/prisma";
import { findTenantBySlug } from "@/server/repositories/tenant-repository";
import {
  findUserAuthContextById,
  findUserByEmail,
  updateUserPassword,
} from "@/server/repositories/user-repository";
import {
  deleteVerificationToken,
  findVerificationToken,
  upsertVerificationToken,
} from "@/server/repositories/verification-token-repository";
import { recordAccessAudit } from "@/server/services/access-audit-service";

function passwordResetIdentifier(email: string) {
  return `password-reset:${email.toLowerCase()}`;
}

function hashResetToken(token: string) {
  return Buffer.from(token).toString("base64url");
}

async function buildUniqueTenantSlug(name: string) {
  const baseSlug = slugify(name);
  let currentSlug = baseSlug;
  let counter = 1;

  while (await findTenantBySlug(currentSlug)) {
    counter += 1;
    currentSlug = `${baseSlug}-${counter}`;
  }

  return currentSlug;
}

export async function authenticateWithCredentials(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user?.hashedPassword) {
    await recordAccessAudit({
      action: "LOGIN_FAILED",
      email: input.email,
      provider: "credentials",
      metadata: { reason: "missing_password" },
    });

    return null;
  }

  const isValidPassword = await compare(input.password, user.hashedPassword);

  if (!isValidPassword) {
    await recordAccessAudit({
      action: "LOGIN_FAILED",
      email: input.email,
      userId: user.id,
      tenantId: user.defaultTenantId,
      provider: "credentials",
      metadata: { reason: "invalid_password" },
    });

    return null;
  }

  const authContext = await findUserAuthContextById(user.id);
  const fallbackTenantId =
    authContext?.defaultTenantId ?? authContext?.memberships[0]?.tenantId ?? null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    platformRole: user.platformRole ?? undefined,
    defaultTenantId: fallbackTenantId ?? undefined,
  };
}

export async function registerWithCredentials(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const hashedPassword = await hash(input.password, 12);
  const tenantSlug = await buildUniqueTenantSlug(input.tenantName);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: input.tenantName,
        slug: tenantSlug,
      },
    });

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        hashedPassword,
        defaultTenantId: tenant.id,
      },
    });

    await tx.tenantMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: "TENANT_OWNER",
        isDefault: true,
      },
    });

    await tx.verificationProfile.create({
      data: {
        tenantId: tenant.id,
        subjectType: "TENANT",
        subjectId: tenant.id,
        status: "PENDING",
      },
    });

    return { user, tenant };
  });

  await recordAccessAudit({
    action: "REGISTER_SUCCESS",
    userId: result.user.id,
    tenantId: result.tenant.id,
    email: result.user.email,
    provider: "credentials",
  });

  return result;
}

export async function createPasswordResetToken(input: ForgotPasswordInput) {
  const user = await findUserByEmail(input.email);
  const rawToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hashedToken = hashResetToken(rawToken);
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  if (user) {
    await upsertVerificationToken(
      passwordResetIdentifier(user.email),
      hashedToken,
      expires,
    );
  }

  await recordAccessAudit({
    action: "PASSWORD_RESET_REQUESTED",
    userId: user?.id,
    tenantId: user?.defaultTenantId,
    email: input.email,
    provider: "credentials",
  });

  return {
    email: input.email,
    token: rawToken,
    expires,
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  const identifier = passwordResetIdentifier(user.email);
  const hashedToken = hashResetToken(input.token);
  const verificationToken = await findVerificationToken(identifier, hashedToken);

  if (!verificationToken || verificationToken.expires < new Date()) {
    throw new Error("INVALID_RESET_TOKEN");
  }

  const hashedPassword = await hash(input.password, 12);
  await updateUserPassword(user.id, hashedPassword);
  await deleteVerificationToken(identifier, hashedToken);

  await recordAccessAudit({
    action: "PASSWORD_RESET_COMPLETED",
    userId: user.id,
    tenantId: user.defaultTenantId,
    email: user.email,
    provider: "credentials",
  });
}
