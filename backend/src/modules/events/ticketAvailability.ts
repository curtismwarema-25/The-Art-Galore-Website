import { EventStatus, TicketTierStatus } from "@prisma/client";

export type TicketAvailabilityState =
  | "HIDDEN"
  | "CANCELLED"
  | "SALES_CLOSED"
  | "UPCOMING"
  | "SOLD_OUT"
  | "AVAILABLE";

export type TicketAvailabilityInput = {
  eventStatus: EventStatus;
  eventEndAt: Date;
  tierStatus: TicketTierStatus;
  allocatedQuantity: number;
  reservedQuantity: number;
  saleStartAt?: Date | null;
  saleEndAt?: Date | null;
  now?: Date;
};

export type TicketAvailability = {
  availabilityState: TicketAvailabilityState;
  allocatedQuantity: number;
  remainingQuantity: number;
};

export function getRemainingTicketQuantity(allocatedQuantity: number, reservedQuantity: number) {
  return Math.max(allocatedQuantity - Math.max(reservedQuantity, 0), 0);
}

export function isTicketQuantityWithinLimit(quantity: number, maxPerOrder?: number | null) {
  return !maxPerOrder || quantity <= maxPerOrder;
}

/**
 * Derives the customer-facing ticket state from persisted event/tier data and
 * the same reserved quantity used by order creation.
 *
 * Existing order semantics are preserved: the opening boundary is inclusive,
 * the configured sale-end boundary is inclusive, and the event end boundary
 * is exclusive.
 */
export function deriveTicketAvailability(input: TicketAvailabilityInput): TicketAvailability {
  const now = input.now ?? new Date();
  const allocatedQuantity = Math.max(input.allocatedQuantity, 0);
  const remainingQuantity = getRemainingTicketQuantity(allocatedQuantity, input.reservedQuantity);

  if (input.eventStatus === EventStatus.CANCELLED) {
    return { availabilityState: "CANCELLED", allocatedQuantity, remainingQuantity };
  }

  if (input.eventStatus !== EventStatus.PUBLISHED || !isPublicTicketTierStatus(input.tierStatus)) {
    return { availabilityState: "HIDDEN", allocatedQuantity, remainingQuantity };
  }

  if (input.eventEndAt <= now || (input.saleEndAt && input.saleEndAt < now)) {
    return { availabilityState: "SALES_CLOSED", allocatedQuantity, remainingQuantity };
  }

  if (input.saleStartAt && input.saleStartAt > now) {
    return { availabilityState: "UPCOMING", allocatedQuantity, remainingQuantity };
  }

  if (input.tierStatus === TicketTierStatus.SOLD_OUT || remainingQuantity === 0) {
    return { availabilityState: "SOLD_OUT", allocatedQuantity, remainingQuantity };
  }

  return { availabilityState: "AVAILABLE", allocatedQuantity, remainingQuantity };
}

function isPublicTicketTierStatus(status: TicketTierStatus) {
  return status === TicketTierStatus.ACTIVE || status === TicketTierStatus.SOLD_OUT;
}
