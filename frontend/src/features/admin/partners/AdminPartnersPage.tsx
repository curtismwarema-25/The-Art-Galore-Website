import { FormEvent, useEffect, useMemo, useState } from "react";
import { ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import {
  adminCheckboxClassName,
  adminCheckboxFieldClassName,
  adminFileInputClassName,
  adminInputClassName,
  adminTextareaClassName,
} from "@/features/admin/shared/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import {
  useArchivePartnerMutation,
  useCreatePartnerMutation,
  useUpdatePartnerMutation,
} from "@/hooks/mutations/usePartnerMutations";
import { useAdminPartnerQuery, useAdminPartnersQuery } from "@/hooks/queries/useAdminPartnersQuery";
import { validateFile } from "@/features/uploads/uploadService";
import type { PartnerRecord, RecordStatus } from "@/types/models";

type PartnerFormState = {
  name: string;
  logoText: string;
  description: string;
  partnershipType: string;
  website: string;
  showOnHomepage: boolean;
  status: "draft" | "published" | "archived";
};

const partnerFormSchema = z.object({
  name: z.string().trim().min(2),
  logoText: z.string().trim().max(16).optional(),
  description: z.string().trim().min(10),
  partnershipType: z.string().trim().min(2),
  website: z.string().trim().url().optional().or(z.literal("")),
  showOnHomepage: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
});

const defaultPartnerForm: PartnerFormState = {
  name: "",
  logoText: "",
  description: "",
  partnershipType: "Program Sponsor",
  website: "",
  showOnHomepage: true,
  status: "draft",
};

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected request error.";
}

function mapPartnerToForm(partner: PartnerRecord): PartnerFormState {
  return {
    name: partner.name,
    logoText: partner.logoText,
    description: partner.description,
    partnershipType: partner.partnershipType,
    website: partner.website ?? "",
    showOnHomepage: partner.showOnHomepage,
    status: partner.status === "draft" || partner.status === "archived" ? partner.status : "published",
  };
}

export default function AdminPartnersPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "staff"]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [homepageOnly, setHomepageOnly] = useState("all");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [createForm, setCreateForm] = useState<PartnerFormState>(defaultPartnerForm);
  const [editForm, setEditForm] = useState<PartnerFormState>(defaultPartnerForm);
  const [createLogoMeta, setCreateLogoMeta] = useState<PartnerRecord["logoMeta"]>();
  const [editLogoMeta, setEditLogoMeta] = useState<PartnerRecord["logoMeta"]>();

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      homepageOnly: homepageOnly === "all" ? undefined : homepageOnly === "yes",
    }),
    [homepageOnly, search, statusFilter],
  );

  const partnersQuery = useAdminPartnersQuery(filters);
  const selectedPartnerQuery = useAdminPartnerQuery(selectedPartnerId);

  const createPartnerMutation = useCreatePartnerMutation();
  const updatePartnerMutation = useUpdatePartnerMutation();
  const archivePartnerMutation = useArchivePartnerMutation();
  const uploadMediaMutation = useUploadMediaMutation();

  const partners = partnersQuery.data ?? [];
  const selectedPartner = selectedPartnerQuery.data;

  useEffect(() => {
    if (!selectedPartner) return;
    setEditForm(mapPartnerToForm(selectedPartner));
    setEditLogoMeta(selectedPartner.logoMeta);
  }, [selectedPartner]);

  async function handleLogoUpload(file: File, mode: "create" | "edit") {
    const validation = validateFile(file, "partner-logo");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid logo file.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({ file, target: "partner-logo" });
      const meta = {
        storageKey: uploaded.storageKey,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        width: uploaded.width,
        height: uploaded.height,
        url: uploaded.url,
      };

      if (mode === "create") {
        setCreateLogoMeta(meta);
      } else {
        setEditLogoMeta(meta);
      }

      toast.success("Logo uploaded.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleCreatePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for Partner management.");
      return;
    }

    const parsed = partnerFormSchema.safeParse(createForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete all required partner fields.");
      return;
    }

    try {
      await createPartnerMutation.mutateAsync({
        name: parsed.data.name.trim(),
        logoText: parsed.data.logoText?.trim() || undefined,
        logoMeta: createLogoMeta,
        description: parsed.data.description.trim(),
        partnershipType: parsed.data.partnershipType.trim(),
        website: parsed.data.website || undefined,
        showOnHomepage: parsed.data.showOnHomepage,
        status: parsed.data.status,
        displayOrder: partners.length + 1,
      });

      setCreateForm(defaultPartnerForm);
      setCreateLogoMeta(undefined);
      toast.success("Partner created.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleUpdatePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for Partner management.");
      return;
    }

    if (!selectedPartnerId) return;

    const parsed = partnerFormSchema.safeParse(editForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete all required partner fields.");
      return;
    }

    try {
      await updatePartnerMutation.mutateAsync({
        id: selectedPartnerId,
        input: {
          name: parsed.data.name.trim(),
          logoText: parsed.data.logoText?.trim() || undefined,
          logoMeta: editLogoMeta,
          description: parsed.data.description.trim(),
          partnershipType: parsed.data.partnershipType.trim(),
          website: parsed.data.website || undefined,
          showOnHomepage: parsed.data.showOnHomepage,
          status: parsed.data.status,
        },
      });

      toast.success("Partner updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleArchivePartner(id: string) {
    if (!canWrite) {
      toast.error("You have read-only access for Partner management.");
      return;
    }

    if (!window.confirm("Archive this partner?")) return;

    try {
      await archivePartnerMutation.mutateAsync(id);
      toast.success("Partner archived.");

      if (selectedPartnerId === id) {
        setSelectedPartnerId("");
        setEditForm(defaultPartnerForm);
        setEditLogoMeta(undefined);
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (partnersQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading partners...</p>;
  }

  if (partnersQuery.isError) {
    return <EmptyState title="Could not load partners" description="Verify admin partner endpoints and active session." />;
  }

  const visiblePartners = partners.filter((partner) => partner.showOnHomepage).length;

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Partners Manager"
        subtitle="Admin/staff can manage partner profiles and homepage visibility. Moderators are read-only."
      />

      <AdminSectionCard title="Add Partner">
        {!canWrite && <p className="text-sm text-foreground-secondary mb-4">Your role is read-only for this section.</p>}
        <form onSubmit={handleCreatePartner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} className={adminInputClassName} placeholder="Partner name" />
          <input value={createForm.logoText} onChange={(event) => setCreateForm((current) => ({ ...current, logoText: event.target.value }))} className={adminInputClassName} placeholder="Logo shortcode" />
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className={adminFileInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleLogoUpload(file, "create");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading logo..."
                : createLogoMeta?.url
                  ? "Logo upload ready."
                  : "Optional logo image (JPG/PNG/WEBP/SVG)."}
            </p>
          </div>
          <select value={createForm.partnershipType} onChange={(event) => setCreateForm((current) => ({ ...current, partnershipType: event.target.value }))} className={adminInputClassName}>
            <option value="Program Sponsor">Program Sponsor</option>
            <option value="Creative Collaboration">Creative Collaboration</option>
            <option value="Venue Partner">Venue Partner</option>
            <option value="Media Partner">Media Partner</option>
            <option value="Network Partner">Network Partner</option>
          </select>
          <input value={createForm.website} onChange={(event) => setCreateForm((current) => ({ ...current, website: event.target.value }))} className={adminInputClassName} placeholder="https://partner.org" />
          <select value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as PartnerFormState["status"] }))} className={adminInputClassName}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <label className={adminCheckboxFieldClassName}>
            <input type="checkbox" checked={createForm.showOnHomepage} onChange={(event) => setCreateForm((current) => ({ ...current, showOnHomepage: event.target.checked }))} className={adminCheckboxClassName} />
            Show on homepage
          </label>
          <div className="md:col-span-2">
            <textarea value={createForm.description} onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))} className={adminTextareaClassName} placeholder="Partner contribution and collaboration scope" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || createPartnerMutation.isPending}>
              {createPartnerMutation.isPending ? "Saving..." : "Add Partner"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="Partner Directory">
        <p className="mb-4 text-xs text-foreground-secondary">{visiblePartners} shown on homepage / {partners.length} total</p>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search partners by name or type"
          filters={[
            {
              key: "status",
              label: "Status",
              value: statusFilter,
              onChange: (value) => setStatusFilter(value as "all" | RecordStatus),
              options: [
                { label: "All", value: "all" },
                { label: "Draft", value: "draft" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
            },
            {
              key: "home",
              label: "Homepage",
              value: homepageOnly,
              onChange: setHomepageOnly,
              options: [
                { label: "All", value: "all" },
                { label: "Homepage", value: "yes" },
                { label: "Directory Only", value: "no" },
              ],
            },
          ]}
        />

        <div className="mt-4">
          {partners.length === 0 ? (
            <EmptyState title="No partners added" description="Create the first partner record to populate this directory." />
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <article key={partner.id} className="rounded-md border border-border bg-background p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-14 rounded-md border border-border bg-secondary/25 flex items-center justify-center">
                      {partner.logoMeta?.url ? (
                        <img src={partner.logoMeta.url} alt={`${partner.name} logo`} className="h-full w-full object-cover rounded-md" />
                      ) : (
                        <span className="text-xs font-display tracking-[0.12em] text-foreground/80">{partner.logoText}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-display text-foreground">{partner.name}</p>
                      <p className="text-[10px] uppercase tracking-[0.15em] text-accent mt-1">{partner.partnershipType}</p>
                      <p className="text-xs text-foreground-secondary mt-1 max-w-2xl">{partner.description}</p>
                      {partner.website && (
                        <a href={partner.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] font-display tracking-[0.14em] uppercase text-accent">
                          Website <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelectedPartnerId(partner.id)}>
                      <PencilLine size={12} /> Edit
                    </Button>
                    {canWrite && (
                      <Button type="button" size="sm" variant="outline" onClick={() => handleArchivePartner(partner.id)} disabled={archivePartnerMutation.isPending}>
                        <Trash2 size={12} /> Archive
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </AdminSectionCard>

      {selectedPartnerId && (
        <AdminSectionCard title="Edit Partner">
          {selectedPartnerQuery.isLoading ? (
            <p className="text-sm text-foreground-secondary">Loading partner details...</p>
          ) : selectedPartnerQuery.isError || !selectedPartner ? (
            <EmptyState title="Could not load partner details" description="Select another partner and retry." />
          ) : (
            <form onSubmit={handleUpdatePartner} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} className={adminInputClassName} placeholder="Partner name" />
              <input value={editForm.logoText} onChange={(event) => setEditForm((current) => ({ ...current, logoText: event.target.value }))} className={adminInputClassName} placeholder="Logo shortcode" />
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className={adminFileInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handleLogoUpload(file, "edit");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading logo..."
                    : editLogoMeta?.url
                      ? "Logo upload ready."
                      : "Optional logo image (JPG/PNG/WEBP/SVG)."}
                </p>
              </div>
              <select value={editForm.partnershipType} onChange={(event) => setEditForm((current) => ({ ...current, partnershipType: event.target.value }))} className={adminInputClassName}>
                <option value="Program Sponsor">Program Sponsor</option>
                <option value="Creative Collaboration">Creative Collaboration</option>
                <option value="Venue Partner">Venue Partner</option>
                <option value="Media Partner">Media Partner</option>
                <option value="Network Partner">Network Partner</option>
              </select>
              <input value={editForm.website} onChange={(event) => setEditForm((current) => ({ ...current, website: event.target.value }))} className={adminInputClassName} placeholder="https://partner.org" />
              <select value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as PartnerFormState["status"] }))} className={adminInputClassName}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <label className={adminCheckboxFieldClassName}>
                <input type="checkbox" checked={editForm.showOnHomepage} onChange={(event) => setEditForm((current) => ({ ...current, showOnHomepage: event.target.checked }))} className={adminCheckboxClassName} />
                Show on homepage
              </label>
              <div className="md:col-span-2">
                <textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className={adminTextareaClassName} placeholder="Partner contribution and collaboration scope" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setSelectedPartnerId(""); setEditLogoMeta(undefined); }}>Cancel</Button>
                <Button type="submit" variant="accent" disabled={!canWrite || updatePartnerMutation.isPending}>
                  {updatePartnerMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
