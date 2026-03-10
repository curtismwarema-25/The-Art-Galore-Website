import { UserStatus } from "@prisma/client";
import { UnauthorizedError } from "../../common/errors/httpErrors.js";
import { createSessionToken, hashSessionToken, SESSION_TTL_MS } from "../../common/auth/session.js";
import { verifyPassword } from "../../common/auth/password.js";
import { AuthRepository } from "./auth.repository.js";
import type { AuthSessionContext, LoginInput, LoginResult } from "./auth.types.js";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

export class AuthService {
  constructor(private readonly repository: AuthRepository = new AuthRepository()) {}

  async login(input: LoginInput, metadata: { ipAddress?: string; userAgent?: string }): Promise<LoginResult> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await this.repository.findUserByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedError("Account is disabled");
    }

    const sessionToken = createSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.repository.createSession({
      userId: user.id,
      sessionTokenHash,
      expiresAt: sessionExpiresAt,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });

    const safeUser = await this.repository.touchLastLogin(user.id);

    return {
      sessionToken,
      sessionExpiresAt,
      user: safeUser,
    };
  }

  async getSessionContext(sessionToken: string): Promise<AuthSessionContext | null> {
    const sessionTokenHash = hashSessionToken(sessionToken);
    const session = await this.repository.findValidSessionByTokenHash(sessionTokenHash);

    if (!session) {
      return null;
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      await this.repository.revokeSessionByTokenHash(sessionTokenHash);
      return null;
    }

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      user: session.user,
    };
  }

  async logout(sessionToken: string) {
    const sessionTokenHash = hashSessionToken(sessionToken);
    await this.repository.revokeSessionByTokenHash(sessionTokenHash);
  }
}
