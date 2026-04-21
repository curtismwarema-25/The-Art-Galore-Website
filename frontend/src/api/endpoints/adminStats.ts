import { resolveStub } from "@/api/client";
import { mockDb } from "@/api/mockDb";

export async function getAdminStats() {
  return resolveStub(mockDb.dashboardStats);
}
