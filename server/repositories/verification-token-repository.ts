import { prisma } from "@/lib/db/prisma";

export function upsertVerificationToken(
  identifier: string,
  token: string,
  expires: Date,
) {
  return prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: { identifier },
    }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    }),
  ]);
}

export function findVerificationToken(identifier: string, token: string) {
  return prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });
}

export function deleteVerificationToken(identifier: string, token: string) {
  return prisma.verificationToken.delete({
    where: {
      identifier_token: {
        identifier,
        token,
      },
    },
  });
}
