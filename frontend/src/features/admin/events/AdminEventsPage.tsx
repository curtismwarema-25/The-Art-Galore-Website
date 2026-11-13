import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { adminFileInputClassName, adminInputClassName, adminLabelClassName, adminTextareaClassName, formatAdminStatus } from "@/features/admin/shared/utils";
import {
  DEFAULT_EVENT_TIMEZONE,
  formatEventDateTime,
  getSafeEventTimezone,
  toEventDateTimeInput,
  toEventIsoString,
} from "./dateTime";
import { buildTicketTierChangeSummary, type TicketTierEditValues } from "./tierChangeSummary";
import AdminEventWorkspaceNav from "./AdminEventWorkspaceNav";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";
import { eventFormSchema } from "./eventForm";

type EventFormState = {
  title: string;
  type: string;
  venue: string;
  capacity: string;
  startAt: string;
  endAt: string;
  lifecycle: EventLifecycle;
  summary: string;
  timezone: string;
};

type TicketTierFormState = TicketTierEditValues;
type ValidationErrors = Record<string, string>;

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
  capacity: "",
  startAt: "",
  endAt: "",
  lifecycle: "draft",
  summary: "",
  timezone: DEFAULT_EVENT_TIMEZONE,
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

const AVAILABILITY_LABELS: Record<NonNullable<TicketTier["availabilityState"]>, string> = {
  AVAILABLE: "Available",
  UPCOMING: "Upcoming",
  SOLD_OUT: "Sold out",
  SALES_CLOSED: "Sales closed",
  HIDDEN: "Hidden",
  CANCELLED: "Cancelled",
};

function availabilityTone(state: NonNullable<TicketTier["availabilityState"]>) {
  if (state === "AVAILABLE") return "published" as const;
  if (state === "UPCOMING") return "pending" as const;
  if (state === "SOLD_OUT" || state === "SALES_CLOSED" || state === "CANCELLED") return "failed" as const;
  return "draft" as const;
}

function AdminField({
  label,
  children,
  description,
  error,
  optional = false,
}: {
  label: string;
  children: ReactNode;
  description?: string;
  error?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-display uppercase tracking-[0.14em] text-foreground-secondary">
        {label} {optional && <span className="normal-case tracking-normal text-foreground-secondary/70">(optional)</span>}
      </span>
      {children}
      {description && <span className="mt-1 block text-xs text-foreground-secondary">{description}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function getValidationErrors(error: z.ZodError) {
  return error.issues.reduce<ValidationErrors>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    if (!errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

function formKey(value: object) {
  return JSON.stringify(value);
}

function mediaKey(value?: EventRecord["heroImageMeta"]) {
  return value?.storageKey ?? value?.url ?? "";
}

function mapEventToForm(record: EventRecord): EventFormState {
  return {
    title: record.title,
    type: record.type,
    venue: record.venue,
    capacity: record.capacity > 0 ? String(record.capacity) : "",
    startAt: toEventDateTimeInput(record.startAt, record.timezone),
    endAt: toEventDateTimeInput(record.endAt, record.timezone),
    lifecycle: record.lifecycle,
    summary: record.summary,
    timezone: record.timezone,
  };
}

function mapTierToForm(tier: TicketTier, timeZone?: string): TicketTierFormState {
  return {
    name: tier.name,
    description: tier.description ?? "",
    price: String(tier.price),
    currency: tier.currency,
    available: String(tier.allocatedQuantity ?? tier.available),
    maxPerOrder: tier.maxPerOrder ? String(tier.maxPerOrder) : "",
    saleStartAt: toEventDateTimeInput(tier.saleStartAt, timeZone),
    saleEndAt: toEventDateTimeInput(tier.saleEndAt, timeZone),
    status: tier.status === "draft" || tier.status === "archived" ? tier.status : "published",
    perks: tier.perks.join("\n"),
  };
}

export default function AdminEventsPage() {
  const { hasRole } = useAuth();
  const canManageMedia = hasRole(["admin", "staff"]);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeEventId } = useParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [createForm, setCreateForm] = useState<EventFormState>(defaultEventForm);
  const [editForm, setEditForm] = useState<EventFormState>(defaultEventForm);
  const [createHeroMeta, setCreateHeroMeta] = useState<EventRecord["heroImageMeta"]>();
  const [editHeroMeta, setEditHeroMeta] = useState<EventRecord["heroImageMeta"]>();
  const [tierForm, setTierForm] = useState<TicketTierFormState>(defaultTicketTierForm);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<TicketTier | null>(null);
  const [editingTierInitialForm, setEditingTierInitialForm] = useState<TicketTierFormState | null>(null);
  const [createEventErrors, setCreateEventErrors] = useState<ValidationErrors>({});
  const [editEventErrors, setEditEventErrors] = useState<ValidationErrors>({});
  const [tierErrors, setTierErrors] = useState<ValidationErrors>({});
  const editBaselineRef = useRef<{
    eventId: string;
    form: EventFormState;
    heroMeta?: EventRecord["heroImageMeta"];
  } | null>(null);

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
  const selectedEventRef = useRef(selectedEvent);
  selectedEventRef.current = selectedEvent;
  const ticketTiersQuery = useAdminTicketTiersQuery(selectedEvent?.id ?? "");

  const createEventMutation = useCreateEventMutation();
  const updateEventMutation = useUpdateEventMutation();
  const deleteEventMutation = useDeleteEventMutation();
  const uploadMediaMutation = useUploadMediaMutation();
  const createTierMutation = useCreateTicketTierMutation();
  const updateTierMutation = useUpdateTicketTierMutation();
  const deleteTierMutation = useDeleteTicketTierMutation();

  useEffect(() => {
    const currentEvent = selectedEventRef.current;
    if (!currentEvent) {
      return;
    }

    if (editBaselineRef.current?.eventId === currentEvent.id) return;

    const form = mapEventToForm(currentEvent);
    editBaselineRef.current = { eventId: currentEvent.id, form, heroMeta: currentEvent.heroImageMeta };
    setEditForm(form);
    setEditHeroMeta(currentEvent.heroImageMeta);
    setEditEventErrors({});
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!routeEventId || !selectedEvent) return;
    const frame = window.requestAnimationFrame(() => {
      const targetId = location.pathname.endsWith("/tickets") ? "admin-ticket-tiers" : "admin-event-editor";
      const target = document.getElementById(targetId);
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, routeEventId, selectedEvent]);

  useEffect(() => {
    if (!editingTierId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("admin-ticket-tier-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editingTierId]);

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
  const ticketSummary = selectedEvent && tiers.every((tier) => tier.remainingQuantity !== undefined)
    ? {
        tierCount: tiers.length,
        allocatedQuantity: tiers.reduce((sum, tier) => sum + (tier.allocatedQuantity ?? tier.available), 0),
        remainingQuantity: tiers.reduce((sum, tier) => sum + (tier.remainingQuantity ?? 0), 0),
      }
    : undefined;
  const tierChangeSummary = editingTier && editingTierInitialForm
    ? buildTicketTierChangeSummary(editingTier, editingTierInitialForm, tierForm)
    : null;
  const createEventDirty = formKey(createForm) !== formKey(defaultEventForm) || Boolean(createHeroMeta);
  const editEventDirty = Boolean(
    selectedEvent &&
    editBaselineRef.current?.eventId === selectedEvent.id &&
    (formKey(editForm) !== formKey(editBaselineRef.current.form) || mediaKey(editHeroMeta) !== mediaKey(editBaselineRef.current.heroMeta)),
  );
  const tierDirty = editingTier ? Boolean(tierChangeSummary?.hasChanges) : formKey(tierForm) !== formKey(defaultTicketTierForm);
  const isDirty = createEventDirty || editEventDirty || tierDirty;
  const canNavigateAway = useUnsavedChangesGuard(isDirty);

  function resetCreateEventForm() {
    setCreateForm(defaultEventForm);
    setCreateHeroMeta(undefined);
    setCreateEventErrors({});
  }

  function resetTierForm() {
    setEditingTierId(null);
    setEditingTier(null);
    setEditingTierInitialForm(null);
    setTierForm(defaultTicketTierForm);
    setTierErrors({});
  }

  function handleDiscardEventChanges() {
    if (!canNavigateAway()) return;
    const baseline = editBaselineRef.current;
    if (!baseline || !selectedEvent || baseline.eventId !== selectedEvent.id) return;
    setEditForm(baseline.form);
    setEditHeroMeta(baseline.heroMeta);
    setEditEventErrors({});
  }

  function handleDiscardTierChanges() {
    if (!canNavigateAway()) return;
    resetTierForm();
  }

  function guardedNavigate(to: string) {
    if (!canNavigateAway()) return;
    navigate(to);
  }

  function formatTierFormDate(value: string) {
    if (!value) return "Not configured";

    try {
      return formatEventDateTime(toEventIsoString(value, selectedEvent?.timezone), selectedEvent?.timezone);
    } catch {
      return `${value.replace("T", " ")} (${getSafeEventTimezone(selectedEvent?.timezone)})`;
    }
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateEventErrors({});
    const parsed = eventFormSchema.safeParse(createForm);

    if (!parsed.success) {
      setCreateEventErrors(getValidationErrors(parsed.error));
      toast.error("Fix the highlighted event fields before saving.");
      return;
    }

    try {
      const created = await createEventMutation.mutateAsync({
        title: parsed.data.title,
        type: parsed.data.type,
        venue: parsed.data.venue,
        capacity: parsed.data.capacity,
         startAt: toEventIsoString(parsed.data.startAt, parsed.data.timezone),
         endAt: toEventIsoString(parsed.data.endAt, parsed.data.timezone),
        lifecycle: parsed.data.lifecycle,
        status: lifecycleToStatus(parsed.data.lifecycle),
        summary: parsed.data.summary?.trim() || undefined,
         timezone: getSafeEventTimezone(parsed.data.timezone),
        heroImage: createHeroMeta?.url ?? undefined,
        heroImageMeta: createHeroMeta,
      });

      resetCreateEventForm();
      toast.success("Event created.");
      navigate(`/admin/events/${created.id}`);
    } catch (error) {
      const message = formatError(error);
      setCreateEventErrors({ form: message });
      toast.error(message);
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

    setEditEventErrors({});
    const parsed = eventFormSchema.safeParse(editForm);
    if (!parsed.success) {
      setEditEventErrors(getValidationErrors(parsed.error));
      toast.error("Fix the highlighted event fields before saving.");
      return;
    }

    try {
      await updateEventMutation.mutateAsync({
        id: selectedEvent.id,
        input: {
          title: parsed.data.title,
          type: parsed.data.type,
          venue: parsed.data.venue,
          capacity: parsed.data.capacity,
           startAt: toEventIsoString(parsed.data.startAt, parsed.data.timezone),
           endAt: toEventIsoString(parsed.data.endAt, parsed.data.timezone),
          lifecycle: parsed.data.lifecycle,
          status: lifecycleToStatus(parsed.data.lifecycle),
          summary: parsed.data.summary?.trim() || undefined,
           timezone: getSafeEventTimezone(parsed.data.timezone),
          heroImage: editHeroMeta?.url ?? undefined,
          heroImageMeta: editHeroMeta,
        },
      });
      const savedEditForm: EventFormState = {
        ...editForm,
        title: parsed.data.title,
        type: parsed.data.type,
        venue: parsed.data.venue,
        capacity: parsed.data.capacity === undefined ? "" : String(parsed.data.capacity),
        startAt: parsed.data.startAt,
        endAt: parsed.data.endAt,
        lifecycle: parsed.data.lifecycle,
        summary: parsed.data.summary ?? "",
        timezone: parsed.data.timezone,
      };
      setEditForm(savedEditForm);
      editBaselineRef.current = { eventId: selectedEvent.id, form: savedEditForm, heroMeta: editHeroMeta };
      toast.success("Event updated.");
    } catch (error) {
      const message = formatError(error);
      setEditEventErrors({ form: message });
      toast.error(message);
    }
  }

  async function handleArchiveEvent(id: string) {
    if (!canNavigateAway()) return;
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

    if (editingTier && tierChangeSummary && !tierChangeSummary.hasChanges) {
      toast.success("No ticket tier changes to save.");
      return;
    }

    setTierErrors({});
    const parsed = tierFormSchema.safeParse(tierForm);
    if (!parsed.success) {
      setTierErrors(getValidationErrors(parsed.error));
      toast.error("Fix the highlighted ticket fields before saving.");
      return;
    }

    const payload = {
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || undefined,
      price: parsed.data.price,
      currency: parsed.data.currency.trim().toUpperCase(),
      available: parsed.data.available,
      maxPerOrder: parsed.data.maxPerOrder,
       saleStartAt: parsed.data.saleStartAt
         ? toEventIsoString(parsed.data.saleStartAt, selectedEvent.timezone)
         : undefined,
       saleEndAt: parsed.data.saleEndAt
         ? toEventIsoString(parsed.data.saleEndAt, selectedEvent.timezone)
         : undefined,
      status: parsed.data.status,
      perks: splitList(parsed.data.perks ?? ""),
    } as const;

    if (editingTier && tierChangeSummary?.requiresConfirmation) {
      const changes = tierChangeSummary.changes.map((change) => `${change.label}: ${change.previous} → ${change.proposed}`).join("\n");
      const warnings = tierChangeSummary.warnings.join("\n\n");
      const confirmed = window.confirm(`Review changes to ${editingTier.name}\n\n${changes}\n\n${warnings}\n\nContinue saving?`);
      if (!confirmed) return;
    }

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

      resetTierForm();
    } catch (error) {
      const message = formatError(error);
      setTierErrors({ form: message });
      toast.error(message);
    }
  }

  function handleEditTier(tier: TicketTier) {
    const initialForm = mapTierToForm(tier, selectedEvent?.timezone);
    setEditingTierId(tier.id);
    setEditingTier(tier);
    setEditingTierInitialForm(initialForm);
    setTierForm(initialForm);
    setTierErrors({});
  }

  async function handleArchiveTier(tierId: string) {
    if (editingTierId === tierId && !canNavigateAway()) return;
    if (!selectedEvent || !window.confirm("Archive this ticket tier?")) return;

    try {
      await deleteTierMutation.mutateAsync({ id: tierId, eventId: selectedEvent.id });
      toast.success("Ticket tier archived.");
      if (editingTierId === tierId) {
        resetTierForm();
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (eventsQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading events…</p>;
  }

  if (eventsQuery.isError) {
    return (
      <EmptyState
        title="Events could not be loaded"
        description="Check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Events"
        subtitle="Create events, update event details, and manage ticket tiers."
      />

      {selectedEvent && (
        <AdminEventWorkspaceNav
          event={selectedEvent}
          currentSection={location.pathname.endsWith("/tickets") ? "tickets" : "overview"}
          ticketSummary={ticketSummary}
        />
      )}

      <AdminSectionCard title="Create event">
        <form onSubmit={handleCreateEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminField label="Event title" error={createEventErrors.title}>
            <input
              value={createForm.title}
              onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))}
              className={adminInputClassName}
              placeholder="Event title"
              required
            />
          </AdminField>
          <AdminField label="Event type" error={createEventErrors.type}>
            <select
              value={createForm.type}
              onChange={(event) => setCreateForm((current) => ({ ...current, type: event.target.value }))}
              className={adminInputClassName}
              aria-label="Event type"
              required
            >
              <option value="Sip & Paint">Sip & Paint</option>
              <option value="Art Night">Art Night</option>
              <option value="Pajama Night">Pajama Night</option>
              <option value="Workshop">Workshop</option>
            </select>
          </AdminField>
          <AdminField label="Starts" error={createEventErrors.startAt}>
            <input
              type="datetime-local"
              aria-label="Event start date and time"
              value={createForm.startAt}
              onChange={(event) => setCreateForm((current) => ({ ...current, startAt: event.target.value }))}
              className={adminInputClassName}
              required
            />
          </AdminField>
          <AdminField label="Ends" error={createEventErrors.endAt}>
            <input
              type="datetime-local"
              aria-label="Event end date and time"
              value={createForm.endAt}
              onChange={(event) => setCreateForm((current) => ({ ...current, endAt: event.target.value }))}
              className={adminInputClassName}
              required
            />
          </AdminField>
          <AdminField
            label="Capacity"
            optional
            description="Leave blank when the venue does not have a fixed event capacity."
            error={createEventErrors.capacity}
          >
            <input
              type="number"
              min={1}
              step={1}
              value={createForm.capacity}
              onChange={(event) => setCreateForm((current) => ({ ...current, capacity: event.target.value }))}
              className={adminInputClassName}
              placeholder="Event capacity"
            />
          </AdminField>
          <AdminField label="Event timezone" error={createEventErrors.timezone} description="Used to interpret event and ticket sale times.">
            <input
              value={createForm.timezone}
              onChange={(event) => setCreateForm((current) => ({ ...current, timezone: event.target.value }))}
              className={adminInputClassName}
              placeholder={DEFAULT_EVENT_TIMEZONE}
              aria-label="Event timezone"
              required
            />
          </AdminField>
          <AdminField label="Venue" error={createEventErrors.venue}>
            <input
              value={createForm.venue}
              onChange={(event) => setCreateForm((current) => ({ ...current, venue: event.target.value }))}
              className={adminInputClassName}
              placeholder="Venue"
              required
            />
          </AdminField>
          <AdminField label="Publishing status" error={createEventErrors.lifecycle}>
            <select
            value={createForm.lifecycle}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, lifecycle: event.target.value as EventLifecycle }))
            }
            className={adminInputClassName}
            aria-label="Event stage"
            required
          >
            <option value="draft">Draft</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="cancelled">Cancelled</option>
            </select>
          </AdminField>
          <div className="md:col-span-2">
            <AdminField label="Public event summary" optional error={createEventErrors.summary}>
              <Textarea
                value={createForm.summary}
                onChange={(event) => setCreateForm((current) => ({ ...current, summary: event.target.value }))}
                className={adminTextareaClassName}
                placeholder="Tell guests what they will experience (optional)"
              />
            </AdminField>
          </div>
          <div className="md:col-span-2">
            <AdminField label="Hero image" optional error={createEventErrors.heroImage}>
            <input
              type="file"
              aria-label="Event hero image"
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
                ? "Uploading hero image…"
                : createHeroMeta?.storageKey
                  ? "Hero image upload ready."
                  : "Optional hero image (JPG/PNG/WEBP)."}
            </p>
            </AdminField>
          </div>
          {createEventErrors.form && <p role="alert" className="md:col-span-2 text-sm text-destructive">{createEventErrors.form}</p>}
          <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
            {createEventDirty && (
              <Button type="button" variant="outline" onClick={resetCreateEventForm}>
                Discard draft
              </Button>
            )}
            <Button type="submit" variant="accent" disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? "Creating event…" : "Create event"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Event list">
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={adminInputClassName}
            placeholder="Search by title, venue, or page address"
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
          <EmptyState title="No matching events" description="Change your search or status filter, or create an event." />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {records.map((record) => (
                <article key={`mobile-${record.id}`} className="rounded-[var(--radius-md)] border border-border bg-card p-4 shadow-none">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-base text-foreground">{record.title}</h3>
                      <p className="mt-1 truncate text-xs text-foreground-secondary">/{record.slug}</p>
                    </div>
                    <StatusBadge
                      tone={
                        record.status === "published"
                          ? "published"
                          : record.status === "draft"
                            ? "draft"
                            : "failed"
                      }
                      label={formatAdminStatus(record.status)}
                    />
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-foreground-secondary">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.1em] text-foreground">When</dt>
                      <dd>{record.date} | {record.time}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.1em] text-foreground">Venue</dt>
                      <dd>{record.venue}</dd>
                    </div>
                  </dl>

                  <label className="mt-4 block">
                    <span className={adminLabelClassName}>Event stage</span>
                    <select
                      value={record.lifecycle}
                      onChange={(event) => handleLifecycleChange(record.id, event.target.value as EventLifecycle)}
                      className={adminInputClassName}
                      aria-label={`${record.title} event stage`}
                      disabled={updateEventMutation.isPending}
                    >
                      <option value="draft">Draft</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>

                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button size="sm" variant="accent" asChild>
                      <Link to={`/admin/events/${record.id}`}>Manage event</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/events/${record.slug}`}>
                        View public page <ExternalLink size={12} />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleArchiveEvent(record.id)}
                      disabled={deleteEventMutation.isPending}
                    >
                      <Trash2 size={12} /> Archive event
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
              <DataTable
                headers={["Event", "Date and time", "Venue", "Event stage", "Listing status", "Actions"]}
                minWidthClassName="min-w-[760px] md:min-w-[980px]"
              >
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className={`cursor-pointer border border-border transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${routeEventId === record.id ? "bg-accent/10" : "bg-background"}`}
                    aria-selected={routeEventId === record.id}
                    tabIndex={0}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;
                      guardedNavigate(`/admin/events/${record.id}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        guardedNavigate(`/admin/events/${record.id}`);
                      }
                    }}
                  >
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
                        aria-label={`${record.title} event stage`}
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
                        label={formatAdminStatus(record.status)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/admin/events/${record.id}`}>Manage event</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/events/${record.slug}`}>
                            View public page <ExternalLink size={12} />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchiveEvent(record.id)}
                          disabled={deleteEventMutation.isPending}
                        >
                          <Trash2 size={12} /> Archive event
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </>
        )}
      </AdminSectionCard>

      {!selectedEvent && (
        <AdminSectionCard title="Ticket tiers">
          <p className="text-sm text-foreground-secondary">
            Select an event row or use its <span className="font-medium text-foreground">Open</span> action. Its editor and ticket setup will appear here.
          </p>
        </AdminSectionCard>
      )}

      {selectedEvent && (
        <>
          <div id="admin-event-editor">
          <AdminSectionCard title="Event configuration" description="Identity, timing, venue, publication status, and media for this event.">
            <form onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminField label="Event title" error={editEventErrors.title}>
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Event title"
                  required
                />
              </AdminField>
              <AdminField label="Event type" error={editEventErrors.type}>
                <input
                  value={editForm.type}
                  onChange={(event) => setEditForm((current) => ({ ...current, type: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Event type"
                  required
                />
              </AdminField>
              <AdminField label="Starts" error={editEventErrors.startAt}>
                <input
                  type="datetime-local"
                  aria-label="Event start date and time"
                  value={editForm.startAt}
                  onChange={(event) => setEditForm((current) => ({ ...current, startAt: event.target.value }))}
                  className={adminInputClassName}
                  required
                />
              </AdminField>
              <AdminField label="Ends" error={editEventErrors.endAt}>
                <input
                  type="datetime-local"
                  aria-label="Event end date and time"
                  value={editForm.endAt}
                  onChange={(event) => setEditForm((current) => ({ ...current, endAt: event.target.value }))}
                  className={adminInputClassName}
                  required
                />
              </AdminField>
              <AdminField
                label="Capacity"
                optional
                description="Leave blank when the venue does not have a fixed event capacity."
                error={editEventErrors.capacity}
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={editForm.capacity}
                  onChange={(event) => setEditForm((current) => ({ ...current, capacity: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Event capacity"
                />
              </AdminField>
              <AdminField label="Event timezone" error={editEventErrors.timezone}>
                <input
                  value={editForm.timezone}
                  onChange={(event) => setEditForm((current) => ({ ...current, timezone: event.target.value }))}
                  className={adminInputClassName}
                  placeholder={DEFAULT_EVENT_TIMEZONE}
                  aria-label="Event timezone"
                  required
                />
                <span className="mt-1 block text-xs text-foreground-secondary">
                  Invalid or blank legacy values fall back to {DEFAULT_EVENT_TIMEZONE}.
                </span>
              </AdminField>
              <AdminField label="Venue" error={editEventErrors.venue}>
                <input
                  value={editForm.venue}
                  onChange={(event) => setEditForm((current) => ({ ...current, venue: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Venue"
                  required
                />
              </AdminField>
              <AdminField label="Publishing status" error={editEventErrors.lifecycle}>
                <select
                value={editForm.lifecycle}
                onChange={(event) => setEditForm((current) => ({ ...current, lifecycle: event.target.value as EventLifecycle }))}
                className={adminInputClassName}
                aria-label="Event stage"
                required
              >
                <option value="draft">Draft</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="cancelled">Cancelled</option>
                </select>
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Public event summary" optional error={editEventErrors.summary}>
                  <Textarea
                    value={editForm.summary}
                    onChange={(event) => setEditForm((current) => ({ ...current, summary: event.target.value }))}
                    className={adminTextareaClassName}
                    placeholder="Summary"
                  />
                </AdminField>
              </div>
              <div className="md:col-span-2">
                <AdminField label="Hero image" optional error={editEventErrors.heroImage}>
                <input
                  type="file"
                  aria-label="Event hero image"
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
                    ? "Uploading hero image…"
                    : editHeroMeta?.storageKey
                      ? "Hero image upload ready."
                      : "Upload hero image to attach/replace."}
                </p>
                </AdminField>
              </div>
              {editEventErrors.form && <p role="alert" className="md:col-span-2 text-sm text-destructive">{editEventErrors.form}</p>}
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                {editEventDirty && (
                  <Button type="button" variant="outline" onClick={handleDiscardEventChanges}>
                    Discard changes
                  </Button>
                )}
                <Button type="submit" variant="accent" disabled={updateEventMutation.isPending}>
                  <PencilLine size={14} /> {updateEventMutation.isPending ? "Saving changes…" : "Save changes"}
                </Button>
              </div>
            </form>
          </AdminSectionCard>
          </div>

          <div id="admin-ticket-tiers">
          <AdminSectionCard title="Ticket management" description="Configure ticket tiers, pricing, sale windows, and effective availability.">
            <p className="mb-3 text-xs text-foreground-secondary">
              Public checkout only shows tiers with status <span className="text-foreground font-medium">Published</span>.
            </p>
            <form onSubmit={handleSubmitTier} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {editingTier && editingTierInitialForm && tierChangeSummary && (
                <div className="md:col-span-2 rounded-md border border-border bg-secondary/15 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base text-foreground">Editing {editingTier.name}</p>
                      <p className="mt-1 text-xs text-foreground-secondary">
                        Review the current configuration and proposed changes before saving.
                      </p>
                    </div>
                    <StatusBadge
                      tone={availabilityTone(editingTier.availabilityState)}
                      label={AVAILABILITY_LABELS[editingTier.availabilityState]}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-foreground-secondary sm:grid-cols-2 lg:grid-cols-4">
                    <p><span className="text-foreground">Price:</span> {editingTier.currency} {editingTier.price.toLocaleString()}</p>
                    <p><span className="text-foreground">Allocated:</span> {editingTier.allocatedQuantity}</p>
                    <p><span className="text-foreground">Remaining:</span> {editingTier.remainingQuantity}</p>
                    <p><span className="text-foreground">Max/order:</span> {editingTier.maxPerOrder ?? "No limit"}</p>
                    <p><span className="text-foreground">Opens:</span> {formatTierFormDate(editingTierInitialForm.saleStartAt)}</p>
                    <p><span className="text-foreground">Closes:</span> {formatTierFormDate(editingTierInitialForm.saleEndAt)}</p>
                    <p><span className="text-foreground">Configuration:</span> {formatAdminStatus(editingTier.status)}</p>
                    <p><span className="text-foreground">Effective:</span> {AVAILABILITY_LABELS[editingTier.availabilityState]}</p>
                  </div>

                  {tierChangeSummary.hasChanges ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-display uppercase tracking-[0.14em] text-foreground">Proposed changes</p>
                      <ul className="mt-2 grid gap-1 text-xs text-foreground-secondary sm:grid-cols-2">
                        {tierChangeSummary.changes.map((change) => (
                          <li key={change.label}>
                            <span className="text-foreground">{change.label}:</span> {change.previous} → {change.proposed}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-border pt-3 text-xs text-foreground-secondary">
                      No changes detected.
                    </p>
                  )}

                  {tierChangeSummary.warnings.length > 0 && (
                    <div className="mt-4 grid gap-2" aria-label="Save warnings">
                      {tierChangeSummary.warnings.map((warning) => (
                        <p key={warning} role="alert" className="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <AdminField label="Ticket name" error={tierErrors.name}>
                <input
                  value={tierForm.name}
                  onChange={(event) => setTierForm((current) => ({ ...current, name: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Tier name"
                  required
                />
              </AdminField>
              <AdminField label="Description" optional error={tierErrors.description}>
                <input
                  value={tierForm.description}
                  onChange={(event) => setTierForm((current) => ({ ...current, description: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Description"
                />
              </AdminField>
              <AdminField label="Price" error={tierErrors.price}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={tierForm.price}
                  onChange={(event) => setTierForm((current) => ({ ...current, price: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Price"
                  required
                />
              </AdminField>
              <AdminField label="Allocation" description="Total tickets allocated to this tier." error={tierErrors.available}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={tierForm.available}
                  onChange={(event) => setTierForm((current) => ({ ...current, available: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Available tickets"
                  required
                />
              </AdminField>
              <AdminField label="Maximum per order" optional description="Leave blank for no per-order limit." error={tierErrors.maxPerOrder}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={tierForm.maxPerOrder}
                  onChange={(event) => setTierForm((current) => ({ ...current, maxPerOrder: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Maximum tickets per order"
                />
              </AdminField>
              <AdminField label="Currency" description="Three-letter currency code." error={tierErrors.currency}>
                <input
                  value={tierForm.currency}
                  onChange={(event) => setTierForm((current) => ({ ...current, currency: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Currency"
                  maxLength={3}
                  required
                />
              </AdminField>
              <AdminField label="Sales open" optional error={tierErrors.saleStartAt}>
                <input
                  type="datetime-local"
                  aria-label="Ticket sales start date and time"
                  value={tierForm.saleStartAt}
                  onChange={(event) => setTierForm((current) => ({ ...current, saleStartAt: event.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="Sales close" optional error={tierErrors.saleEndAt}>
                <input
                  type="datetime-local"
                  aria-label="Ticket sales end date and time"
                  value={tierForm.saleEndAt}
                  onChange={(event) => setTierForm((current) => ({ ...current, saleEndAt: event.target.value }))}
                  className={adminInputClassName}
                />
              </AdminField>
              <AdminField label="Ticket visibility" error={tierErrors.status}>
                <select
                value={tierForm.status}
                onChange={(event) =>
                  setTierForm((current) => ({ ...current, status: event.target.value as TicketTierFormState["status"] }))
                }
                className={adminInputClassName}
                aria-label="Ticket tier status"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
                </select>
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Perks" optional error={tierErrors.perks}>
                  <Textarea
                    value={tierForm.perks}
                    onChange={(event) => setTierForm((current) => ({ ...current, perks: event.target.value }))}
                    className={adminTextareaClassName}
                    placeholder="Ticket benefits (separate with commas or new lines)"
                  />
                </AdminField>
              </div>
              {tierErrors.form && <p role="alert" className="md:col-span-2 text-sm text-destructive">{tierErrors.form}</p>}
              <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
                {editingTierId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDiscardTierChanges}
                  >
                    Discard changes
                  </Button>
                )}
                <Button type="submit" variant="accent" disabled={createTierMutation.isPending || updateTierMutation.isPending}>
                  {editingTierId ? "Update Tier" : "Add Tier"}
                </Button>
              </div>
            </form>

            {ticketTiersQuery.isLoading ? (
              <p className="text-sm text-foreground-secondary">Loading ticket tiers…</p>
            ) : ticketTiersQuery.isError ? (
              <EmptyState title="Ticket tiers could not be loaded" description="Check your connection and try again." />
            ) : tiers.length === 0 ? (
              <EmptyState title="No ticket tiers yet" description="Add a tier for this event." />
            ) : (
              <DataTable
                headers={["Ticket type", "Price", "Inventory", "Configuration", "Effective availability", "Sale window", "Actions"]}
                minWidthClassName="min-w-[980px] md:min-w-[1180px]"
              >
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
                      <p><span className="text-foreground">Allocated:</span> {tier.allocatedQuantity}</p>
                      <p><span className="text-foreground">Remaining:</span> {tier.remainingQuantity}</p>
                      {tier.maxPerOrder && <p className="text-xs">Max {tier.maxPerOrder}/order</p>}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        tone={tier.status === "published" ? "published" : tier.status === "draft" ? "draft" : "failed"}
                        label={formatAdminStatus(tier.status)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        tone={availabilityTone(tier.availabilityState)}
                        label={AVAILABILITY_LABELS[tier.availabilityState]}
                      />
                    </td>
                    <td className="px-3 py-3 text-xs text-foreground-secondary">
                      <p>{tier.saleStartAt ? `Opens ${formatEventDateTime(tier.saleStartAt, selectedEvent.timezone)}` : "Opens immediately"}</p>
                      <p>{tier.saleEndAt ? `Closes ${formatEventDateTime(tier.saleEndAt, selectedEvent.timezone)}` : "No closing date"}</p>
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
                          <Trash2 size={12} /> Archive tier
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </AdminSectionCard>
          </div>
        </>
      )}
    </div>
  );
}
