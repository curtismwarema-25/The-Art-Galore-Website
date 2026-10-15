import type { Express } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { adminEventsRouter, adminTicketTiersRouter } from "./modules/events/events.admin.routes.js";
import { eventsRouter } from "./modules/events/events.routes.js";
import { adminGalleryRouter } from "./modules/gallery/gallery.admin.routes.js";
import { galleryRouter } from "./modules/gallery/gallery.routes.js";
import { mediaRouter } from "./modules/media/media.routes.js";
import { adminOrdersRouter, ordersRouter } from "./modules/orders/orders.routes.js";
import { adminPartnersRouter } from "./modules/partners/partners.admin.routes.js";
import { partnersRouter } from "./modules/partners/partners.routes.js";
import { adminPaymentsRouter, paymentsRouter } from "./modules/payments/payments.routes.js";
import { adminPeopleRouter } from "./modules/people/people.admin.routes.js";
import { peopleRouter } from "./modules/people/people.routes.js";
import { adminSettingsRouter, settingsRouter } from "./modules/settings/settings.routes.js";
import { adminTicketsRouter, ticketsRouter } from "./modules/tickets/tickets.routes.js";
import { adminUploadsRouter, uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { adminStatsRouter } from "./modules/dashboard/dashboard.routes.js";

export function registerRoutes(app: Express, apiPrefix = "/api") {
  app.use(`${apiPrefix}/auth`, authRouter);
  app.use(`${apiPrefix}/admin/auth`, authRouter);

  app.use(`${apiPrefix}/events`, eventsRouter);
  app.use(`${apiPrefix}/people`, peopleRouter);
  app.use(`${apiPrefix}/admin/people`, adminPeopleRouter);
  app.use(`${apiPrefix}/partners`, partnersRouter);
  app.use(`${apiPrefix}/admin/partners`, adminPartnersRouter);
  app.use(`${apiPrefix}/gallery-images`, galleryRouter);
  app.use(`${apiPrefix}/admin/gallery-images`, adminGalleryRouter);
  app.use(`${apiPrefix}/media`, mediaRouter);
  app.use(`${apiPrefix}/site-settings`, settingsRouter);
  app.use(`${apiPrefix}/admin/site-settings`, adminSettingsRouter);
  app.use(`${apiPrefix}/admin/events`, adminEventsRouter);
  app.use(`${apiPrefix}/admin/ticket-tiers`, adminTicketTiersRouter);
  app.use(`${apiPrefix}/community-uploads`, uploadsRouter);
  app.use(`${apiPrefix}/admin/community-uploads`, adminUploadsRouter);

  app.use(`${apiPrefix}/admin/orders`, adminOrdersRouter);
  app.use(`${apiPrefix}/admin/payments`, adminPaymentsRouter);
  app.use(`${apiPrefix}/admin/tickets`, adminTicketsRouter);
  app.use(`${apiPrefix}/admin/stats`, adminStatsRouter);

  app.use(`${apiPrefix}/orders`, ordersRouter);
  app.use(`${apiPrefix}/tickets`, ticketsRouter);
  // Backward-compatible alias for earlier upload path usage.
  app.use(`${apiPrefix}/uploads`, uploadsRouter);
  app.use(`${apiPrefix}/payments`, paymentsRouter);
}
