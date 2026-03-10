import { resolveStub } from "@/api/client";
import { mockDb } from "@/api/mockDb";
import type { CheckInStatus, TicketRecord } from "@/types/models";

export async function getTickets() {
  return resolveStub(mockDb.tickets);
}

export async function getTicketById(ticketId: string) {
  return resolveStub(mockDb.tickets.find((ticket) => ticket.id === ticketId) ?? null);
}

export async function searchTickets(query: string) {
  const normalized = query.trim().toLowerCase();
  const matches = mockDb.tickets.filter((ticket) => {
    return ticket.id.toLowerCase().includes(normalized) || ticket.orderId.toLowerCase().includes(normalized);
  });
  return resolveStub(matches);
}

export async function updateTicketCheckIn(ticketId: string, status: CheckInStatus) {
  return resolveStub({ ticketId, status });
}

export async function issueTicket(input: Partial<TicketRecord>) {
  return resolveStub({ ...input, id: `ticket-${Date.now()}` } as TicketRecord);
}
