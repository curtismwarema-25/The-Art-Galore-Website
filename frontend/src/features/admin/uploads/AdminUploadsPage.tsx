import { useMemo, useState } from "react";
import { Check, Eye, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { adminInputClassName, formatDateTime } from "@/features/admin/shared/utils";
import { useAuth } from "@/features/auth/useAuth";
import { useDeleteUploadMutation, useModerateUploadMutation } from "@/hooks/mutations/useUploadMutations";
import { useAdminEventsQuery } from "@/hooks/queries/useAdminEventsQuery";
import { useAdminUploadQuery, useAdminUploadsQuery } from "@/hooks/queries/useAdminUploadsQuery";
import type { ModerationStatus } from "@/types/models";

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected request error.";
}

export default function AdminUploadsPage() {
  const { hasRole } = useAuth();
  const canModerate = hasRole(["admin", "staff", "moderator"]);
  const canDelete = hasRole(["admin", "staff"]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ModerationStatus>("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [selectedUploadId, setSelectedUploadId] = useState("");
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      eventId: eventFilter === "all" ? undefined : eventFilter,
    }),
    [eventFilter, search, statusFilter],
  );

  const uploadsQuery = useAdminUploadsQuery(filters);
  const uploadDetailQuery = useAdminUploadQuery(selectedUploadId);
  const eventsQuery = useAdminEventsQuery();

  const moderateMutation = useModerateUploadMutation();
  const deleteMutation = useDeleteUploadMutation();

  const uploads = useMemo(() => uploadsQuery.data ?? [], [uploadsQuery.data]);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const eventById = useMemo(() => Object.fromEntries(events.map((event) => [event.id, event])), [events]);

  async function handleModerate(uploadId: string, decision: Exclude<ModerationStatus, "pending">) {
    if (!canModerate) {
      toast.error("You do not have permission to moderate uploads.");
      return;
    }

    try {
      const notes = moderationNotes[uploadId]?.trim();
      await moderateMutation.mutateAsync({
        uploadId,
        input: {
          decision,
          notes: notes || undefined,
        },
      });
      toast.success(`Upload ${decision}.`);
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleDelete(uploadId: string) {
    if (!canDelete) {
      toast.error("Only admin/staff can delete uploads.");
      return;
    }

    if (!window.confirm("Delete this upload and its moderation history?")) return;

    try {
      await deleteMutation.mutateAsync(uploadId);
      toast.success("Upload deleted.");
      if (selectedUploadId === uploadId) {
        setSelectedUploadId("");
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (uploadsQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading moderation queue...</p>;
  }

  if (uploadsQuery.isError) {
    return <EmptyState title="Could not load uploads" description="Verify admin community upload endpoints and active session." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Community Upload Moderation"
        subtitle="Moderators, staff, and admins can review uploads. Deletion remains admin/staff only."
      />

      <AdminSectionCard title="Moderation Queue">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by alias, upload ID, or event"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as "all" | ModerationStatus),
              options: [
                { label: "All", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Approved", value: "approved" },
                { label: "Rejected", value: "rejected" },
              ],
            },
            {
              key: "event",
              label: "Event",
              value: eventFilter,
              onChange: setEventFilter,
              options: [{ label: "All Events", value: "all" }].concat(
                events.map((event) => ({ label: event.title, value: event.id })),
              ),
            },
          ]}
        />

        <div className="mt-4 space-y-3">
          {uploads.length === 0 && <EmptyState title="Queue is empty" description="No uploads match current filters." />}

          {uploads.map((upload) => (
            <article
              key={upload.id}
              className="rounded-md border border-border bg-background p-4 flex flex-col gap-4"
            >
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex items-start gap-3">
                  <img src={upload.image} alt={upload.alias} className="h-16 w-16 rounded-sm object-cover" />
                  <div>
                    <p className="font-display text-sm text-foreground">{upload.alias}</p>
                    <p className="text-xs text-foreground-secondary">{eventById[upload.eventId]?.title ?? "Unknown Event"}</p>
                    <p className="text-xs text-foreground-secondary mt-1">Submitted: {formatDateTime(upload.submittedAt)}</p>
                    {upload.reviewedBy && (
                      <p className="text-xs text-foreground-secondary">
                        Reviewed by {upload.reviewedBy} {upload.reviewedAt ? `on ${formatDateTime(upload.reviewedAt)}` : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge tone={upload.status} />
                  <Button type="button" size="sm" variant="outline" onClick={() => setSelectedUploadId(upload.id)}>
                    <Eye size={14} /> Details
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleModerate(upload.id, "approved")}
                    disabled={!canModerate || moderateMutation.isPending}
                  >
                    <Check size={14} /> Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleModerate(upload.id, "rejected")}
                    disabled={!canModerate || moderateMutation.isPending}
                  >
                    <X size={14} /> Reject
                  </Button>
                  {canDelete && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(upload.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  )}
                </div>
              </div>

              <input
                value={moderationNotes[upload.id] ?? ""}
                onChange={(event) =>
                  setModerationNotes((current) => ({
                    ...current,
                    [upload.id]: event.target.value,
                  }))
                }
                placeholder="Optional moderation note/reason"
                className={adminInputClassName}
              />
            </article>
          ))}
        </div>
      </AdminSectionCard>

      {selectedUploadId && (
        <AdminSectionCard title="Upload Review Detail">
          {uploadDetailQuery.isLoading ? (
            <p className="text-sm text-foreground-secondary">Loading upload details...</p>
          ) : uploadDetailQuery.isError || !uploadDetailQuery.data ? (
            <EmptyState title="Could not load upload detail" description="Select another upload and retry." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
                <img src={uploadDetailQuery.data.image} alt={uploadDetailQuery.data.alias} className="w-full aspect-[4/5] object-cover rounded-md border border-border" />
                <div className="space-y-1 text-sm text-foreground-secondary">
                  <p><span className="text-foreground">Alias:</span> {uploadDetailQuery.data.alias}</p>
                  <p><span className="text-foreground">Event:</span> {eventById[uploadDetailQuery.data.eventId]?.title ?? uploadDetailQuery.data.eventId}</p>
                  <p><span className="text-foreground">Status:</span> {uploadDetailQuery.data.status}</p>
                  <p><span className="text-foreground">Submitted:</span> {formatDateTime(uploadDetailQuery.data.submittedAt)}</p>
                  {uploadDetailQuery.data.submitterEmail && (
                    <p><span className="text-foreground">Submitter Email:</span> {uploadDetailQuery.data.submitterEmail}</p>
                  )}
                  {uploadDetailQuery.data.submitterPhone && (
                    <p><span className="text-foreground">Submitter Phone:</span> {uploadDetailQuery.data.submitterPhone}</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-display text-foreground mb-2">Review History</h4>
                {uploadDetailQuery.data.reviewHistory?.length ? (
                  <div className="space-y-2">
                    {uploadDetailQuery.data.reviewHistory.map((review) => (
                      <div key={review.id} className="rounded-md border border-border bg-secondary/20 p-3">
                        <p className="text-xs text-foreground-secondary">
                          {review.reviewerName} | {review.decision} | {formatDateTime(review.reviewedAt)}
                        </p>
                        {review.notes && <p className="text-sm text-foreground-secondary mt-1">{review.notes}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-secondary">No review entries yet.</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setSelectedUploadId("")}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
