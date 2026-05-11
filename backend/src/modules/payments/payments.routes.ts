import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { PaymentsService } from "./payments.service.js";
import {
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

export const paymentsRouter = Router();
export const adminPaymentsRouter = Router();

paymentsRouter.post("/manual/:publicToken/proof", validateRequest(submitManualPaymentSchema), async (req, res, next) => {
  try {
    const { publicToken } = submitManualPaymentSchema.shape.params.parse(req.params);
    const body = submitManualPaymentSchema.shape.body.parse(req.body);

    const submission = await paymentsService.submitManualPaymentProof(publicToken, body, body.screenshot);

    res.status(201).json({ data: submission });
  } catch (error) {
    next(error);
  }
});

paymentsRouter.post("/mpesa/stk/:publicToken/initiate", validateRequest(stkPushInitiateSchema), async (req, res, next) => {
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

paymentsRouter.post("/mpesa/stk/callback", validateRequest(z.object({ body: mpesaStkCallbackSchema })), async (req, res, next) => {
  try {
    const payload = mpesaStkCallbackSchema.parse(req.body);
    await paymentsService.ingestMpesaStkCallback(payload);
    res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    next(error);
  }
});

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
