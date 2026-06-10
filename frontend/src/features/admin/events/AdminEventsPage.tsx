import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { z } from "zod";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { useCreateEventMutation, useDeleteEventMutation, useUpdateEventMutation } from "@/hooks/mutations/useEventMutations";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import {
  useCreateTicketTierMutation,
  useDeleteTicketTierMutation,
  useUpdateTicketTierMutation,
} from "@/hooks/mutations/useTicketTierMutations";
import { useAdminEventQuery, useAdminEventsQuery, useAdminTicketTiersQuery } from "@/hooks/queries";
import { validateFile } from "@/features/uploads/uploadService";
import { useAuth } from "@/features/auth/useAuth";
import type { EventLifecycle, EventRecord, RecordStatus, TicketTier } from "@/types/models";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { adminFileInputClassName, adminInputClassName, adminTextareaClassName } from "@/features/admin/shared/utils";

type EventFormState = {
  title: string;
  type: string;
  venue: string;
  startAt: string;
  endAt: string;
  lifecycle: EventLifecycle;
  summary: string;
  timezone: string;
};

type TicketTierFormState = {
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

const eventFormSchema = z
  .object({
    title: z.string().trim().min(3),
    type: z.string().trim().min(2),
    venue: z.string().trim().min(2),
    startAt: z.string().trim().min(1),
    endAt: z.string().trim().min(1),
    lifecycle: z.enum(["draft", "upcoming", "past", "cancelled"]),
    summary: z.string().trim().max(500).optional(),
    timezone: z.string().trim().min(1).max(64),
  })
  .refine((value) => new Date(value.endAt).getTime() > new Date(value.startAt).getTime(), {
    message: "End date/time must be after start date/time.",
    path: ["endAt"],
  });

const tierFormSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(5000).optional(),
    price: z.coerce.number().min(0),
    currency: z.string().trim().length(3),
    available: z.coerce.number().int().nonnegative(),
    maxPerOrder: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
      z.number().int().positive().optional(),
    ),
    saleStartAt: z.string().trim().optional(),
    saleEndAt: z.string().trim().optional(),
    status: z.enum(["draft", "published", "archived"]),
    perks: z.string().optional(),
  })
  .refine(
    (value) => {
      if (!value.saleStartAt || !value.saleEndAt) return true;
      return new Date(value.saleEndAt).getTime() > new Date(value.saleStartAt).getTime();
    },
    {
      message: "Sale end must be after sale start.",
      path: ["saleEndAt"],
    },
  );

const defaultEventForm: EventFormState = {
  title: "",
  type: "Sip & Paint",
  venue: "",
  startAt: "",
  endAt: "",
  lifecycle: "draft",
  summary: "",
  timezone: "Africa/Nairobi",
};

const defaultTicketTierForm: TicketTierFormState = {
  name: "",
  description: "",
  price: "0",
  currency: "KES",
  available: "0",
  maxPerOrder: "",
  saleStartAt: "",
  saleEndAt: "",
  status: "published",
  perks: "",
};

function toIsoString(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

function toLocalDateTimeInput(isoDateTime?: string) {
  if (!isoDateTime) return "";
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function lifecycleToStatus(lifecycle: EventLifecycle): RecordStatus {
  if (lifecycle === "draft") return "draft";
  if (lifecycle === "cancelled") return "cancelled";
  return "published";
}

function splitList(value: string) {
  return value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected request error.";
}

function mapEventToForm(record: EventRecord): EventFormState {
  return {
    title: record.title,
    type: record.type,
    venue: record.venue,
    startAt: toLocalDateTimeInput(record.startAt),
    endAt: toLocalDateTimeInput(record.endAt),
    lifecycle: record.lifecycle,
    summary: record.summary,
    timezone: record.timezone,
  };
}

function mapTierToForm(tier: TicketTier): TicketTierFormState {
  return {
    name: tier.name,
    description: tier.description ?? "",
    price: String(tier.price),
    currency: tier.currency,
    available: String(tier.available),
    maxPerOrder: tier.maxPerOrder ? String(tier.maxPerOrder) : "",
    saleStartAt: toLocalDateTimeInput(tier.saleStartAt),
    saleEndAt: toLocalDateTimeInput(tier.saleEndAt),
    status: tier.status === "draft" || tier.status === "archived" ? tier.status : "published",
    perks: tier.perks.join("\n"),
  };
}

export default function AdminEventsPage() {
  const { hasRole } = useAuth();
  const canManageMedia = hasRole(["admin", "staff"]);
  const navigate = useNavigate();
  const { id: routeEventId } = useParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [createForm, setCreateForm] = useState<EventFormState>(defaultEventForm);
  const [editForm, setEditForm] = useState<EventFormState>(defaultEventForm);
  const [createHeroMeta, setCreateHeroMeta] = useState<EventRecord["heroImageMeta"]>();
  const [editHeroMeta, setEditHeroMeta] = useState<EventRecord["heroImageMeta"]>();
  const [tierForm, setTierForm] = useState<TicketTierFormState>(defaultTicketTierForm);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [search, statusFilter],
  );

  const eventsQuery = useAdminEventsQuery(filters);
  const selectedEventQuery = useAdminEventQuery(routeEventId ?? "");
  const selectedEvent = useMemo(() => {
    if (!routeEventId) return null;
    if (selectedEventQuery.data) return selectedEventQuery.data;
    if (!eventsQuery.data) return null;
    return eventsQuery.data.find((event) => event.id === routeEventId) ?? null;
  }, [eventsQuery.data, routeEventId, selectedEventQuery.data]);
  const ticketTiersQuery = useAdminTicketTiersQuery(selectedEvent?.id ?? "");

  const createEventMutation = useCreateEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const deleteEventMutation = useDeleteEventMutation();
  const uploadMediaMutation = useUploadMediaMutation();
  const createTierMutation = useCreateTicketTierMutation();
  const updateTierMutation = useUpdateTicketTierMutation();
  const deleteTierMutation = useDeleteTicketTierMutation();

  useEffect(() => {
    if (!selectedEvent) return;
    setEditForm(mapEventToForm(selectedEvent));
    setEditHeroMeta(selectedEvent.heroImageMeta);
  }, [selectedEvent]);

  async function handleHeroUpload(file: File, mode: "create" | "edit") {
    const validation = validateFile(file, "event-hero");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid hero image.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({ file, target: "event-hero" });
      const meta = {
        storageKey: uploaded.storageKey,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        width: uploaded.width,
        height: uploaded.height,
        url: uploaded.url,
      };

      if (mode === "create") {
        setCreateHeroMeta(meta);
      } else {
        setEditHeroMeta(meta);
      }

      toast.success("Hero image uploaded.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  const records = eventsQuery.data ?? [];
  const tiers = ticketTiersQuery.data ?? [];

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = eventFormSchema.safeParse(createForm);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete all event fields.");
      return;
    }

    try {
      const created = await createEventMutation.mutateAsync({
        title: parsed.data.title,
        type: parsed.data.type,
        venue: parsed.data.venue,
        startAt: toIsoString(parsed.data.startAt),
        endAt: toIsoString(parsed.data.endAt),
        lifecycle: parsed.data.lifecycle,
        status: lifecycleToStatus(parsed.data.lifecycle),
        summary: parsed.data.summary?.trim() || undefined,
        timezone: parsed.data.timezone.trim(),
        heroImage: createHeroMeta?.url ?? undefined,
        heroImageMeta: createHeroMeta,
      });

      setCreateForm(defaultEventForm);
      setCreateHeroMeta(undefined);
      toast.success("Event created.");
      navigate(`/admin/events/${created.id}`);
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleLifecycleChange(id: string, lifecycle: EventLifecycle) {
    try {
      await updateEventMutation.mutateAsync({
        id,
        input: {
          lifecycle,
          status: lifecycleToStatus(lifecycle),
        },
      });
      toast.success("Event status updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleSaveEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) return;

    const parsed = eventFormSchema.safeParse(editForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete required edit fields.");
      return;
    }

    try {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        input: {
          title: parsed.data.title,
          type: parsed.data.type,
          venue: parsed.data.venue,
          startAt: toIsoString(parsed.data.startAt),
          endAt: toIsoString(parsed.data.endAt),
          lifecycle: parsed.data.lifecycle,
          status: lifecycleToStatus(parsed.data.lifecycle),
          summary: parsed.data.summary?.trim() || undefined,
          timezone: parsed.data.timezone.trim(),
          heroImage: editHeroMeta?.url ?? undefined,
          heroImageMeta: editHeroMeta,
        },
      });
      toast.success("Event updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleArchiveEvent(id: string) {
    if (!window.confirm("Archive this event?")) return;

    try {
      await deleteEventMutation.mutateAsync(id);
      toast.success("Event archived.");
      if (routeEventId === id) {
        navigate("/admin/events");
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleSubmitTier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) return;

    const parsed = tierFormSchema.safeParse(tierForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete ticket tier fields.");
      return;
    }

    const payload = {
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || undefined,
      price: parsed.data.price,
      currency: parsed.data.currency.trim().toUpperCase(),
      available: parsed.data.available,
      maxPerOrder: parsed.data.maxPerOrder,
      saleStartAt: parsed.data.saleStartAt ? toIsoString(parsed.data.saleStartAt) : undefined,
      saleEndAt: parsed.data.saleEndAt ? toIsoString(parsed.data.saleEndAt) : undefined,
      status: parsed.data.status,
      perks: splitList(parsed.data.perks ?? ""),
    } as const;

    try {
      if (editingTierId) {
        await updateTierMutation.mutateAsync({ id: editingTierId, input: payload });
        toast.success("Ticket tier updated.");
      } else {
        await createTierMutation.mutateAsync({
          eventId: selectedEvent.id,
          input: {
            ...payload,
            displayOrder: tiers.length + 1,
          },
        });
        toast.success("Ticket tier created.");
      }

      setEditingTierId(null);
      setTierForm(defaultTicketTierForm);
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  function handleEditTier(tier: TicketTier) {
    setEditingTierId(tier.id);
    setTierForm(mapTierToForm(tier));
  }

  async function handleArchiveTier(tierId: string) {
    if (!selectedEvent || !window.confirm("Archive this ticket tier?")) return;

    try {
      await deleteTierMutation.mutateAsync({ id: tierId, eventId: selectedEvent.id });
      toast.success("Ticket tier archived.");
      if (editingTierId === tierId) {
        setEditingTierId(null);
        setTierForm(defaultTicketTierForm);
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading events...</p>;
  }

  if (eventsQuery.isError) {
    return (
      <EmptyState
        title="Could not load admin events"
        description="Verify backend admin events endpoints and your current session."
      />
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Events Manager"
        subtitle="Create, update, and archive events with real backend CRUD."
      />

      <AdminSectionCard title="Create Event">
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={createForm.title}
            onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
            className={adminInputClassName}
            placeholder="Event title"
          />
          <select
            value={createForm.type}
            onChange={(event) => setCreateForm((current) => ({ ...current, type: event.target.value }))}
            className={adminInputClassName}
          >
            <option value="Sip & Paint">Sip & Paint</option>
            <option value="Art Night">Art Night</option>
            <option value="Pajama Night">Pajama Night</option>
            <option value="Workshop">Workshop</option>
          </select>
          <input
            type="datetime-local"
            value={createForm.startAt}
            onChange={(event) => setCreateForm((current) => ({ ...current, startAt: event.target.value }))}
            className={adminInputClassName}
          />
          <input
            type="datetime-local"
            value={createForm.endAt}
            onChange={(event) => setCreateForm((current) => ({ ...current, endAt: event.target.value }))}
            className={adminInputClassName}
          />
          <input
            value={createForm.venue}
            onChange={(event) => setCreateForm((current) => ({ ...current, venue: event.target.value }))}
            className={adminInputClassName}
            placeholder="Venue"
          />
          <select
            value={createForm.lifecycle}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, lifecycle: event.target.value as EventLifecycle }))
            }
            className={adminInputClassName}
          >
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="md:col-span-2">
            <Textarea
              value={createForm.summary}
              onChange={(event) => setCreateForm((current) => ({ ...current, summary: event.target.value }))}
              className={adminTextareaClassName}
              placeholder="Summary (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFileInputClassName}
              disabled={!canManageMedia || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleHeroUpload(file, "create");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading hero image..."
                : createHeroMeta?.storageKey
                  ? "Hero image upload ready."
                  : "Optional hero image (JPG/PNG/WEBP)."}
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Saving..." : "Add Event"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Event List">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={adminInputClassName}
            placeholder="Search title, venue, slug..."
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | RecordStatus)}
            className={adminInputClassName}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {records.length === 0 ? (
          <EmptyState title="No events found" description="Create an event or adjust your filters." />
        ) : (
          <DataTable
            headers={["Title", "Date", "Venue", "Lifecycle", "Status", "Actions"]}
            minWidthClassName="min-w-[760px] md:min-w-[980px]"
          >
            {records.map((record) => (
              <tr key={record.id} className="bg-background border border-border">
                <td className="px-3 py-3">
                  <div>
                    <p className="text-sm text-foreground">{record.title}</p>
                    <p className="text-xs text-foreground-secondary">/{record.slug}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">
                  {record.date} | {record.time}
                </td>
                <td className="px-3 py-3 text-sm text-foreground-secondary">{record.venue}</td>
                <td className="px-3 py-3">
                  <select
                    value={record.lifecycle}
                    onChange={(event) => handleLifecycleChange(record.id, event.target.value as EventLifecycle)}
                    className={adminInputClassName}
                    disabled={updateEventMutation.isPending}
                  >
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge
                    tone={
                      record.status === "published"
                        ? "published"
                        : record.status === "draft"
                          ? "draft"
                          : "failed"
                    }
                    label={record.status}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/admin/events/${record.id}`}>Manage</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/events/${record.slug}`}>
                        Public <ExternalLink size={12} />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchiveEvent(record.id)}
                      disabled={deleteEventMutation.isPending}
                    >
                      <Trash2 size={12} /> Archive
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminSectionCard>

      {!selectedEvent && (
        <AdminSectionCard title="Ticket Tiers">
          <p className="text-sm text-foreground-secondary">
            Select an event using the <span className="font-medium text-foreground">Manage</span> action to create or update
            ticket tiers.
          </p>
        </AdminSectionCard>
      )}

      {selectedEvent && (
        <>
          <AdminSectionCard title="Edit Event">
            <form onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={editForm.title}
                onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                className={adminInputClassName}
                placeholder="Event title"
              />
              <input
                value={editForm.type}
                onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}
                className={adminInputClassName}
                placeholder="Event type"
              />
              <input
                type="datetime-local"
                value={editForm.startAt}
                onChange={(event) => setEditForm((current) => ({ ...current, startAt: event.target.value }))}
                className={adminInputClassName}
              />
              <input
                type="datetime-local"
                value={editForm.endAt}
                onChange={(event) => setEditForm((current) => ({ ...current, endAt: event.target.value }))}
                className={adminInputClassName}
              />
              <input
                value={editForm.venue}
                onChange={(event) => setEditForm((current) => ({ ...current, venue: event.target.value }))}
                className={adminInputClassName}
                placeholder="Venue"
              />
              <select
                value={editForm.lifecycle}
                onChange={(event) => setEditForm((current) => ({ ...current, lifecycle: event.target.value as EventLifecycle }))}
                className={adminInputClassName}
              >
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="md:col-span-2">
                <Textarea
                  value={editForm.summary}
                  onChange={(event) => setEditForm((current) => ({ ...current, summary: event.target.value }))}
                  className={adminTextareaClassName}
                  placeholder="Summary"
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminFileInputClassName}
                  disabled={!canManageMedia || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleHeroUpload(file, "edit");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading hero image..."
                    : editHeroMeta?.storageKey
                      ? "Hero image upload ready."
                      : "Upload hero image to attach/replace."}
                </p>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" variant="accent" disabled={updateEventMutation.isPending}>
                  <PencilLine size={14} /> {updateEventMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </AdminSectionCard>

          <AdminSectionCard title="Ticket Tiers">
            <p className="mb-3 text-xs text-foreground-secondary">
              Public checkout only shows tiers with status <span className="text-foreground font-medium">Published</span>.
            </p>
            <form onSubmit={handleSubmitTier} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                value={tierForm.name}
                onChange={(event) => setTierForm((current) => ({ ...current, name: event.target.value }))}
                className={adminInputClassName}
                placeholder="Tier name"
              />
              <input
                value={tierForm.description}
                onChange={(event) => setTierForm((current) => ({ ...current, description: event.target.value }))}
                className={adminInputClassName}
                placeholder="Description"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={tierForm.price}
                onChange={(event) => setTierForm((current) => ({ ...current, price: event.target.value }))}
                className={adminInputClassName}
                placeholder="Price"
              />
              <input
                type="number"
                min={0}
                value={tierForm.available}
                onChange={(event) => setTierForm((current) => ({ ...current, available: event.target.value }))}
                className={adminInputClassName}
                placeholder="Available tickets"
              />
              <input
                type="number"
                min={1}
                value={tierForm.maxPerOrder}
                onChange={(event) => setTierForm((current) => ({ ...current, maxPerOrder: event.target.value }))}
                className={adminInputClassName}
                placeholder="Max per order (optional)"
              />
              <input
                value={tierForm.currency}
                onChange={(event) => setTierForm((current) => ({ ...current, currency: event.target.value }))}
                className={adminInputClassName}
                placeholder="Currency"
                maxLength={3}
              />
              <input
                type="datetime-local"
                value={tierForm.saleStartAt}
                onChange={(event) => setTierForm((current) => ({ ...current, saleStartAt: event.target.value }))}
                className={adminInputClassName}
              />
              <input
                type="datetime-local"
                value={tierForm.saleEndAt}
                onChange={(event) => setTierForm((current) => ({ ...current, saleEndAt: event.target.value }))}
                className={adminInputClassName}
              />
              <select
                value={tierForm.status}
                onChange={(event) =>
                  setTierForm((current) => ({ ...current, status: event.target.value as TicketTierFormState["status"] }))
                }
                className={adminInputClassName}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <div className="md:col-span-2">
                <Textarea
                  value={tierForm.perks}
                  onChange={(event) => setTierForm((current) => ({ ...current, perks: event.target.value }))}
                  className={adminTextareaClassName}
                  placeholder="Perks (comma or newline separated)"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                {editingTierId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingTierId(null);
                      setTierForm(defaultTicketTierForm);
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
                <Button type="submit" variant="accent" disabled={createTierMutation.isPending || updateTierMutation.isPending}>
                  {editingTierId ? "Update Tier" : "Add Tier"}
                </Button>
              </div>
            </form>

            {ticketTiersQuery.isLoading ? (
              <p className="text-sm text-foreground-secondary">Loading ticket tiers...</p>
            ) : ticketTiersQuery.isError ? (
              <EmptyState title="Could not load ticket tiers" description="Verify ticket tier admin endpoints." />
            ) : tiers.length === 0 ? (
              <EmptyState title="No ticket tiers yet" description="Add a tier for this event." />
            ) : (
              <DataTable headers={["Name", "Price", "Available", "Status", "Actions"]} minWidthClassName="min-w-[720px] md:min-w-[860px]">
                {tiers.map((tier) => (
                  <tr key={tier.id} className="bg-background border border-border">
                    <td className="px-3 py-3">
                      <p className="text-sm text-foreground">{tier.name}</p>
                      <p className="text-xs text-foreground-secondary">{tier.perks.join(", ") || "No perks"}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary">
                      {tier.currency} {tier.price.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-foreground-secondary">
                      {tier.available}
                      {tier.maxPerOrder ? ` | Max ${tier.maxPerOrder}/order` : ""}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        tone={tier.status === "published" ? "published" : tier.status === "draft" ? "draft" : "failed"}
                        label={tier.status}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditTier(tier)}>
                          <PencilLine size={12} /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchiveTier(tier.id)}
                          disabled={deleteTierMutation.isPending}
                        >
                          <Trash2 size={12} /> Archive
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </AdminSectionCard>
        </>
      )}
    </div>
  );
}
