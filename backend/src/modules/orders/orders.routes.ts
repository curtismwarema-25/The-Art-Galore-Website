import { UserRole } from "@prisma/client";
import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authorize } from "../../common/middleware/authorize.js";
import { validateRequest } from "../../common/validation/validateRequest.js";
import { OrdersService } from "./orders.service.js";
import {
  adminOrderIdParamsSchema,
  createOrderSchema,
  listAdminOrdersQuerySchema,
  orderNumberParamsSchema,
} from "./orders.schema.js";

const ORDER_ADMIN_READ_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.STAFF];

const ordersService = new OrdersService();

export const ordersRouter = Router();
export const adminOrdersRouter = Router();

ordersRouter.post("/", validateRequest(createOrderSchema), async (req, res, next) => {
  try {
    const body = createOrderSchema.shape.body.parse(req.body);
    const idempotencyKeyHeader = req.header("Idempotency-Key");
    const result = await ordersService.createOrder(body, idempotencyKeyHeader);

    res.status(result.idempotentReplay ? 200 : 201).json({
      data: result.order,
      meta: {
        idempotentReplay: result.idempotentReplay,
      },
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:orderNumber", validateRequest(orderNumberParamsSchema), async (req, res, next) => {
  try {
    const { orderNumber } = orderNumberParamsSchema.shape.params.parse(req.params);
    const order = await ordersService.getOrderByOrderNumber(orderNumber);

    res.status(200).json({ data: order });
  } catch (error) {
    next(error);
  }
});

adminOrdersRouter.use(authenticate, authorize(ORDER_ADMIN_READ_ROLES));

adminOrdersRouter.get("/", validateRequest(listAdminOrdersQuerySchema), async (req, res, next) => {
  try {
    const query = listAdminOrdersQuerySchema.shape.query.parse(req.query);
    const orders = await ordersService.listAdminOrders({
      status: query.status,
      eventId: query.eventId,
      search: query.search,
    });

    res.status(200).json({ data: orders });
  } catch (error) {
    next(error);
  }
});

adminOrdersRouter.get("/:id", validateRequest(adminOrderIdParamsSchema), async (req, res, next) => {
  try {
    const { id } = adminOrderIdParamsSchema.shape.params.parse(req.params);
    const order = await ordersService.getAdminOrderById(id);

    res.status(200).json({ data: order });
  } catch (error) {
    next(error);
  }
});
