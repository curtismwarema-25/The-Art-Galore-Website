import { Router } from "express";
import { clearSessionCookie, getSessionCookieName, setSessionCookie } from "../../common/auth/session.js";
import { UnauthorizedError } from "../../common/errors/httpErrors.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { ADMIN_ACCESS_ROLES, authorize } from "../../common/middleware/authorize.js";
import { loginRateLimiter } from "../../common/middleware/loginRateLimit.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { loginRequestSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { toAuthPublicUser } from "./auth.types.js";

export const authRouter = Router();
const authService = new AuthService();

authRouter.post("/login", validateRequest(loginRequestSchema), async (req, res, next) => {
  const emailForLimit = typeof req.body?.email === "string" ? req.body.email : undefined;
  const limiterKey = loginRateLimiter.buildKey(req.ip, emailForLimit);

  try {
    loginRateLimiter.assertAllowed(limiterKey);

    const result = await authService.login(req.body, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
    });
    loginRateLimiter.recordSuccess(limiterKey);

    setSessionCookie(res, result.sessionToken);

    res.status(200).json({
      data: {
        user: toAuthPublicUser(result.user),
        sessionExpiresAt: result.sessionExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      loginRateLimiter.recordFailure(limiterKey);
    }

    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const sessionToken = req.cookies?.[getSessionCookieName()];

    if (sessionToken && typeof sessionToken === "string") {
      await authService.logout(sessionToken);
    }

    clearSessionCookie(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", authenticate, authorize(ADMIN_ACCESS_ROLES), (req, res) => {
  res.status(200).json({
    data: {
      user: toAuthPublicUser(req.auth!.user),
    },
  });
});
