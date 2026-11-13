import type { TicketTier } from "@/types/models";

export type TicketTierEditValues = {
  name: string;
  description: string;
  price: string;
  currency: string;
  available: string;
  maxPerOrder: string;
  saleStartAt: string;
  saleEndAt: string;
  status: "draft" | "published" | "archived";
  perks: string;
};

export type TicketTierChange = {
  label: string;
  previous: string;
  proposed: string;
};

export type TicketTierChangeSummary = {
  changes: TicketTierChange[];
  hasChanges: boolean;
  requiresConfirmation: boolean;
  allocation: {
    previous: number;
    proposed: number;
    delta: number;
    reduced: boolean;
    inferredCommittedQuantity: number;
    belowInferredCommittedQuantity: boolean;
  };
  warnings: string[];
};

function normalizeText(value: string) {
  return value.trim();
}

function normalizeCurrency(value: string) {
  return normalizeText(value).toUpperCase();
}

function normalizeOptionalNumber(value: string) {
  const normalized = normalizeText(value);
  return normalized === "" ? undefined : Number(normalized);
}

function displayValue(value: string | number | undefined) {
  return value === undefined || value === "" ? "Not configured" : String(value);
}

function addChange(changes: TicketTierChange[], label: string, previous: string, proposed: string) {
  if (previous !== proposed) {
    changes.push({ label, previous: displayValue(previous), proposed: displayValue(proposed) });
  }
}

export function buildTicketTierChangeSummary(
  tier: TicketTier,
  previous: TicketTierEditValues,
  proposed: TicketTierEditValues,
): TicketTierChangeSummary {
  const previousAllocation = tier.allocatedQuantity ?? tier.available;
  const proposedAllocation = Number(proposed.available);
  const previousPrice = Number(previous.price);
  const proposedPrice = Number(proposed.price);
  const previousMaxPerOrder = normalizeOptionalNumber(previous.maxPerOrder);
  const proposedMaxPerOrder = normalizeOptionalNumber(proposed.maxPerOrder);
  const previousCurrency = normalizeCurrency(previous.currency);
  const proposedCurrency = normalizeCurrency(proposed.currency);
  const inferredCommittedQuantity = Math.max(previousAllocation - Math.max(tier.remainingQuantity ?? 0, 0), 0);
  const reduced = proposedAllocation < previousAllocation;
  const belowInferredCommittedQuantity = proposedAllocation < inferredCommittedQuantity;
  const changes: TicketTierChange[] = [];

  addChange(changes, "Ticket name", normalizeText(previous.name), normalizeText(proposed.name));
  addChange(changes, "Description", normalizeText(previous.description), normalizeText(proposed.description));
  addChange(changes, "Price", `${previousCurrency} ${previousPrice}`, `${proposedCurrency} ${proposedPrice}`);
  addChange(changes, "Allocated quantity", String(previousAllocation), String(proposedAllocation));
  addChange(
    changes,
    "Maximum per order",
    displayValue(previousMaxPerOrder),
    displayValue(proposedMaxPerOrder),
  );
  addChange(changes, "Sale opening", displayValue(previous.saleStartAt), displayValue(proposed.saleStartAt));
  addChange(changes, "Sale closing", displayValue(previous.saleEndAt), displayValue(proposed.saleEndAt));
  addChange(changes, "Configuration status", previous.status, proposed.status);
  addChange(changes, "Perks", normalizeText(previous.perks), normalizeText(proposed.perks));

  const warnings: string[] = [];
  if (reduced) {
    warnings.push(
      `Reducing allocation from ${previousAllocation} to ${proposedAllocation} may affect existing orders and reservations. ` +
        "The backend remains authoritative; this warning does not guarantee inventory safety.",
    );
  }
  if (belowInferredCommittedQuantity) {
    warnings.push(
      `The proposed allocation is below the ${inferredCommittedQuantity} quantity currently represented by allocation minus remaining inventory. ` +
        "The API does not separate sold and reserved quantities, so review active orders and reservations carefully.",
    );
  }
  if (previousPrice !== proposedPrice || previousCurrency !== proposedCurrency) {
    warnings.push("Price changes affect future orders. Existing paid tickets are not automatically repriced or cancelled.");
  }
  if (previous.saleStartAt !== proposed.saleStartAt || previous.saleEndAt !== proposed.saleEndAt) {
    warnings.push("Sale-window changes affect future availability. Existing paid tickets are not automatically cancelled.");
  }
  if (previousMaxPerOrder !== proposedMaxPerOrder) {
    warnings.push("Maximum-per-order changes affect future checkout validation.");
  }
  if (previous.status !== proposed.status && proposed.status === "published") {
    warnings.push("Publishing makes this tier eligible for public visibility, subject to backend-derived availability.");
  }
  if (previous.status !== proposed.status && proposed.status === "archived") {
    warnings.push("Archiving hides this tier from new public sales. Existing paid tickets are not automatically cancelled.");
  }

  return {
    changes,
    hasChanges: changes.length > 0,
    requiresConfirmation: warnings.length > 0,
    allocation: {
      previous: previousAllocation,
      proposed: proposedAllocation,
      delta: proposedAllocation - previousAllocation,
      reduced,
      inferredCommittedQuantity,
      belowInferredCommittedQuantity,
    },
    warnings,
  };
}
