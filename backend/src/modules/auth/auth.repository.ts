import { UserStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const safeAuthUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AuthUserSelect;

export class AuthRepository {
  async findUserByEmail(email: string) {
    return prisma.authUser.findUnique({ where: { email }, select: { ...safeAuthUserSelect, passwordHash: true } });
  }

  async createSession(params: {
    userId: string;
    sessionTokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.authSession.create({
      data: {
        userId: params.userId,
        sessionTokenHash: params.sessionTokenHash,
        expiresAt: params.expiresAt,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  async findValidSessionByTokenHash(sessionTokenHash: string) {
    return prisma.authSession.findFirst({
      where: {
        sessionTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: safeAuthUserSelect,
        },
      },
    });
  }

  async revokeSessionByTokenHash(sessionTokenHash: string) {
    await prisma.authSession.updateMany({
      where: {
        sessionTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async touchLastLogin(userId: string) {
    return prisma.authUser.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
      select: safeAuthUserSelect,
    });
  }

  async setUserPasswordAndStatus(userId: string, passwordHash: string) {
    return prisma.authUser.update({
      where: { id: userId },
      data: {
        passwordHash,
        status: UserStatus.ACTIVE,
      },
      select: safeAuthUserSelect,
    });
  }
}
