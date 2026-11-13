import { UserRole } from "@prisma/client";
import { Router, type Request, type RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { UnauthorizedError } from "../../common/errors/httpErrors.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { createSimpleRateLimit } from "../../common/middleware/simpleRateLimit.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { env } from "../../config/index.js";
import { isLegacyMpesaCallbackConfigured } from "../../config/env.js";
import { PaymentsService } from "./payments.service.js";
import {
  adminMpesaTransactionIdParamsSchema,
  mpesaStkCallbackSchema,
  listAdminMpesaTransactionsQuerySchema,
  listAdminManualPaymentsQuerySchema,
  reviewManualPaymentActionSchema,
  stkPushInitiateSchema,
  submitManualPaymentSchema,
} from "./payments.schema.js";

const PAYMENT_REVIEW_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF, UserRole.MODERATOR];
const PAYMENT_REVIEW_WRITE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const paymentsService = new PaymentsService();
const publicPaymentRateLimit = createSimpleRateLimit({
  keyPrefix: "public-payment",
  windowMs: 15 * 60 * 1000,
  maxAttempts: 30,
});

export const paymentsRouter = Router();
export const adminPaymentsRouter = Router();

paymentsRouter.post("/manual/:publicToken/proof", publicPaymentRateLimit, validateRequest(submitManualPaymentSchema), async (req, res, next) => {
  try {
    const { publicToken } = submitManualPaymentSchema.shape.params.parse(req.params);
    const body = submitManualPaymentSchema.shape.body.parse(req.body);

    const submission = await paymentsService.submitManualPaymentProof(publicToken, body, body.screenshot);

    res.status(201).json({ data: submission });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/mpesa/stk/:publicToken/initiate", publicPaymentRateLimit, validateRequest(stkPushInitiateSchema), async (req, res, next) => {
  try {
    const { publicToken } = stkPushInitiateSchema.shape.params.parse(req.params);
    const body = stkPushInitiateSchema.shape.body.parse(req.body);
    const idempotencyKeyHeader = req.header("Idempotency-Key");
    const result = await paymentsService.initiateStkPush(publicToken, body, idempotencyKeyHeader);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
});

function secretsMatch(received: string | undefined, expected: string) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function assertMpesaCallbackAuthorized(req: Request) {
  const callbackPathToken = req.params.callbackToken;
  if (callbackPathToken !== undefined) {
    if (typeof req.query.secret === "string") {
      throw new UnauthorizedError("Query-string callback authentication is not accepted on the tokenized callback route");
    }

    if (!secretsMatch(callbackPathToken, env.MPESA_CALLBACK_PATH_TOKEN)) {
      throw new UnauthorizedError("Invalid M-Pesa callback path");
    }
    return;
  }

  const legacyCallbackConfigured = isLegacyMpesaCallbackConfigured(env);
  if (env.NODE_ENV === "production" && !legacyCallbackConfigured) {
    throw new UnauthorizedError("M-Pesa callback path authentication is required");
  }

  const headerSecret = req.header("x-mpesa-callback-secret");
  const bearerToken = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : undefined;

  if (querySecret && !legacyCallbackConfigured) {
    throw new UnauthorizedError("Legacy M-Pesa callback authentication is disabled");
  }

  if (querySecret && !secretsMatch(querySecret, env.MPESA_CALLBACK_SECRET)) {
    throw new UnauthorizedError("Invalid M-Pesa callback secret");
  }

  const receivedSecret = headerSecret || bearerToken || (legacyCallbackConfigured ? querySecret : undefined);

  if (!env.MPESA_CALLBACK_SECRET) {
    if (env.NODE_ENV === "production" || legacyCallbackConfigured) {
      throw new UnauthorizedError("M-Pesa callback authentication is not configured");
    }
    return;
  }

  if (!secretsMatch(receivedSecret, env.MPESA_CALLBACK_SECRET)) {
    throw new UnauthorizedError("Invalid M-Pesa callback secret");
  }
}

const authorizeMpesaCallback: RequestHandler = (req, _res, next) => {
  try {
    assertMpesaCallbackAuthorized(req);
    next();
  } catch (error) {
    next(error);
  }
};

const handleMpesaStkCallback: RequestHandler = async (req, res, next) => {
  try {
    const payload = mpesaStkCallbackSchema.parse(req.body);
    await paymentsService.ingestMpesaStkCallback(payload);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
};

paymentsRouter.post("/mpesa/stk/callback/:callbackToken", authorizeMpesaCallback, validateRequest(z.object({ body: mpesaStkCallbackSchema })), handleMpesaStkCallback);
paymentsRouter.post("/mpesa/stk/callback", authorizeMpesaCallback, validateRequest(z.object({ body: mpesaStkCallbackSchema })), handleMpesaStkCallback);

adminPaymentsRouter.use(authenticate);

adminPaymentsRouter.get(
  "/mpesa-transactions",
  authorize(PAYMENT_REVIEW_READ_ROLES),
  validateRequest(listAdminMpesaTransactionsQuerySchema),
  async (req, res, next) => {
    try {
      const query = listAdminMpesaTransactionsQuerySchema.shape.query.parse(req.query);
      const rows = await paymentsService.listAdminMpesaTransactions({
        orderId: query.orderId,
        search: query.search,
        status: query.status,
        limit: query.limit,
      });
      res.status(200).json({ data: rows });
    } catch (error) {
      next(error);
    }
  },
);

adminPaymentsRouter.post(
  "/mpesa-transactions/:id/reverify",
  authorize(PAYMENT_REVIEW_WRITE_ROLES),
  validateRequest(adminMpesaTransactionIdParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = adminMpesaTransactionIdParamsSchema.shape.params.parse(req.params);
      const result = await paymentsService.reverifyMpesaTransaction(id, { source: "admin" });
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

adminPaymentsRouter.get(
  "/manual-submissions",
  authorize(PAYMENT_REVIEW_READ_ROLES),
  validateRequest(listAdminManualPaymentsQuerySchema),
  async (req, res, next) => {
    try {
      const query = listAdminManualPaymentsQuerySchema.shape.query.parse(req.query);
      const submissions = await paymentsService.listAdminManualPayments({
        verificationStatus: query.verificationStatus,
        orderId: query.orderId,
        search: query.search,
      });

      res.status(200).json({ data: submissions });
    } catch (error) {
      next(error);
    }
  },
);

adminPaymentsRouter.post(
  "/manual-submissions/:id/approve",
  authorize(PAYMENT_REVIEW_WRITE_ROLES),
  validateRequest(reviewManualPaymentActionSchema),
  async (req, res, next) => {
    try {
      const { id } = reviewManualPaymentActionSchema.shape.params.parse(req.params);
      const input = reviewManualPaymentActionSchema.shape.body.parse(req.body);
      const result = await paymentsService.approveManualPaymentSubmission(id, req.auth!.user.id, input);

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);

adminPaymentsRouter.post(
  "/manual-submissions/:id/reject",
  authorize(PAYMENT_REVIEW_WRITE_ROLES),
  validateRequest(reviewManualPaymentActionSchema),
  async (req, res, next) => {
    try {
      const { id } = reviewManualPaymentActionSchema.shape.params.parse(req.params);
      const input = reviewManualPaymentActionSchema.shape.body.parse(req.body);
      const result = await paymentsService.rejectManualPaymentSubmission(id, req.auth!.user.id, input);

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  },
);
