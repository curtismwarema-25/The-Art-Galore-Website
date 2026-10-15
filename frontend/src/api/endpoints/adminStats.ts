import { apiRequest } from "@/api/client";
import type { DashboardStats } from "@/types/models";

export async function getAdminStats() {
  const response = await apiRequest<{ data: DashboardStats }>("/admin/stats", {
    method: "GET",
  });

  return response.data;
}
