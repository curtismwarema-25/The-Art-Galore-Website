import { FormEvent, useEffect, useMemo, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { z } from "zod";
import DataTable from "@/components/common/DataTable";
import EmptyState from "@/components/common/EmptyState";
import FilterBar from "@/components/common/FilterBar";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { adminInputClassName } from "@/features/admin/shared/utils";
import { useAuth } from "@/features/auth/AuthContext";
import { validateFile } from "@/features/uploads/uploadService";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import {
  useArchivePersonMutation,
  useCreatePersonMutation,
  useUpdatePersonMutation,
} from "@/hooks/mutations/usePersonMutations";
import { useAdminPeopleQuery, useAdminPersonQuery } from "@/hooks/queries/useAdminPeopleQuery";
import type { PersonCategory, PersonRecord, RecordStatus } from "@/types/models";

type PersonFormState = {
  name: string;
  role: string;
  category: PersonCategory;
  isArtist: boolean;
  medium: string;
  bio: string;
  status: "draft" | "published" | "archived";
  featuredWorks: string;
};

const personFormSchema = z.object({
  name: z.string().trim().min(2),
  role: z.string().trim().min(2),
  category: z.enum(["leadership", "member"]),
  isArtist: z.boolean(),
  medium: z.string().trim().min(2),
  bio: z.string().trim().min(10),
  status: z.enum(["draft", "published", "archived"]),
  featuredWorks: z.string().optional(),
});

const defaultPersonForm: PersonFormState = {
  name: "",
  role: "",
  category: "member",
  isArtist: true,
  medium: "Mixed Media",
  bio: "",
  status: "draft",
  featuredWorks: "",
};

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected request error.";
}

function splitList(value: string) {
  return value
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(values: string[]) {
  return values.join("\n");
}

function mapPersonToForm(person: PersonRecord): PersonFormState {
  return {
    name: person.name,
    role: person.role,
    category: person.category,
    isArtist: person.isArtist,
    medium: person.medium,
    bio: person.bio,
    status: person.status === "draft" || person.status === "archived" ? person.status : "published",
    featuredWorks: joinList(person.featuredWorks),
  };
}

export default function AdminPeoplePage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "staff"]);

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "artists" | "team">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [createForm, setCreateForm] = useState<PersonFormState>(defaultPersonForm);
  const [editForm, setEditForm] = useState<PersonFormState>(defaultPersonForm);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [createImageMeta, setCreateImageMeta] = useState<PersonRecord["imageMeta"]>();
  const [editImageMeta, setEditImageMeta] = useState<PersonRecord["imageMeta"]>();
  const [createCoverMeta, setCreateCoverMeta] = useState<PersonRecord["coverImageMeta"]>();
  const [editCoverMeta, setEditCoverMeta] = useState<PersonRecord["coverImageMeta"]>();

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      scope: scopeFilter === "all" ? undefined : scopeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    [scopeFilter, search, statusFilter],
  );

  const peopleQuery = useAdminPeopleQuery(filters);
  const personQuery = useAdminPersonQuery(selectedPersonId);

  const createPersonMutation = useCreatePersonMutation();
  const updatePersonMutation = useUpdatePersonMutation();
  const archivePersonMutation = useArchivePersonMutation();
  const uploadMediaMutation = useUploadMediaMutation();

  const people = peopleQuery.data ?? [];
  const selectedPerson = personQuery.data;

  useEffect(() => {
    if (!selectedPerson) return;
    setEditForm(mapPersonToForm(selectedPerson));
    setEditImageMeta(selectedPerson.imageMeta);
    setEditCoverMeta(selectedPerson.coverImageMeta);
  }, [selectedPerson]);

  async function handlePersonImageUpload(file: File, mode: "create" | "edit", target: "person-profile" | "person-cover") {
    const validation = validateFile(file, target);
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid image file.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({ file, target });
      const meta = {
        storageKey: uploaded.storageKey,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        width: uploaded.width,
        height: uploaded.height,
        url: uploaded.url,
      };

      if (target === "person-profile") {
        if (mode === "create") setCreateImageMeta(meta);
        if (mode === "edit") setEditImageMeta(meta);
      } else {
        if (mode === "create") setCreateCoverMeta(meta);
        if (mode === "edit") setEditCoverMeta(meta);
      }

      toast.success(target === "person-profile" ? "Profile image uploaded." : "Cover image uploaded.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleCreatePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for people records.");
      return;
    }

    const parsed = personFormSchema.safeParse(createForm);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete required person fields.");
      return;
    }

    try {
      const created = await createPersonMutation.mutateAsync({
        name: parsed.data.name.trim(),
        role: parsed.data.role.trim(),
        category: parsed.data.category,
        isArtist: parsed.data.isArtist,
        medium: parsed.data.medium.trim(),
        bio: parsed.data.bio.trim(),
        image: createImageMeta?.url,
        imageMeta: createImageMeta,
        coverImage: createCoverMeta?.url,
        coverImageMeta: createCoverMeta,
        status: parsed.data.status,
        featuredWorks: splitList(parsed.data.featuredWorks ?? ""),
      });

      setCreateForm(defaultPersonForm);
      setCreateImageMeta(undefined);
      setCreateCoverMeta(undefined);
      setSelectedPersonId(created.id);
      toast.success("Person profile created.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleUpdatePerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      toast.error("You have read-only access for people records.");
      return;
    }

    if (!selectedPersonId) return;

    const parsed = personFormSchema.safeParse(editForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete required edit fields.");
      return;
    }

    try {
      await updatePersonMutation.mutateAsync({
        id: selectedPersonId,
        input: {
          name: parsed.data.name.trim(),
          role: parsed.data.role.trim(),
          category: parsed.data.category,
          isArtist: parsed.data.isArtist,
          medium: parsed.data.medium.trim(),
          bio: parsed.data.bio.trim(),
          image: editImageMeta?.url,
          imageMeta: editImageMeta,
          coverImage: editCoverMeta?.url,
          coverImageMeta: editCoverMeta,
          status: parsed.data.status,
          featuredWorks: splitList(parsed.data.featuredWorks ?? ""),
        },
      });

      toast.success("Person profile updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleArchivePerson(id: string) {
    if (!canWrite) {
      toast.error("You have read-only access for people records.");
      return;
    }

    if (!window.confirm("Archive this person profile?")) return;

    try {
      await archivePersonMutation.mutateAsync(id);
      toast.success("Person archived.");

      if (selectedPersonId === id) {
        setSelectedPersonId("");
        setEditForm(defaultPersonForm);
        setEditImageMeta(undefined);
        setEditCoverMeta(undefined);
      }
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  if (peopleQuery.isLoading) {
    return <p className="text-sm text-foreground-secondary">Loading people...</p>;
  }

  if (peopleQuery.isError) {
    return <EmptyState title="Could not load people" description="Verify admin people endpoints and active session." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="People Manager"
        subtitle="Admin and staff can create/update records. Moderators have read-only access."
      />

      <AdminSectionCard title="Create Person">
        {!canWrite && (
          <p className="text-sm text-foreground-secondary mb-4">
            Your role is read-only for People management.
          </p>
        )}
        <form onSubmit={handleCreatePerson} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={createForm.name}
            onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
            className={adminInputClassName}
            placeholder="Full name"
          />
          <input
            value={createForm.role}
            onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}
            className={adminInputClassName}
            placeholder="Role / title"
          />
          <select
            value={createForm.category}
            onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value as PersonCategory }))}
            className={adminInputClassName}
          >
            <option value="leadership">Leadership</option>
            <option value="member">Member</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-foreground-secondary">
            <input
              type="checkbox"
              checked={createForm.isArtist}
              onChange={(event) => setCreateForm((current) => ({ ...current, isArtist: event.target.checked }))}
            />
            Artist profile
          </label>
          <input
            value={createForm.medium}
            onChange={(event) => setCreateForm((current) => ({ ...current, medium: event.target.value }))}
            className={adminInputClassName}
            placeholder="Medium / specialty"
          />
          <select
            value={createForm.status}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, status: event.target.value as PersonFormState["status"] }))
            }
            className={adminInputClassName}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handlePersonImageUpload(file, "create", "person-profile");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading profile image..."
                : createImageMeta?.url
                  ? "Profile image upload ready."
                  : "Optional profile image."}
            </p>
          </div>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handlePersonImageUpload(file, "create", "person-cover");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading cover image..."
                : createCoverMeta?.url
                  ? "Cover image upload ready."
                  : "Optional cover image."}
            </p>
          </div>
          <div className="md:col-span-2">
            <Textarea
              value={createForm.bio}
              onChange={(event) => setCreateForm((current) => ({ ...current, bio: event.target.value }))}
              className={adminInputClassName}
              placeholder="Bio"
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              value={createForm.featuredWorks}
              onChange={(event) => setCreateForm((current) => ({ ...current, featuredWorks: event.target.value }))}
              className={adminInputClassName}
              placeholder="Featured works (comma or newline separated)"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || createPersonMutation.isPending}>
              {createPersonMutation.isPending ? "Saving..." : "Create Person"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="People Directory">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, role, or medium"
          filters={[
            {
              key: "scope",
              label: "Scope",
              value: scopeFilter,
              onChange: (value) => setScopeFilter(value as "all" | "artists" | "team"),
              options: [
                { label: "All", value: "all" },
                { label: "Artists", value: "artists" },
                { label: "Team", value: "team" },
              ],
            },
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
          ]}
        />

        <div className="mt-4">
          {people.length === 0 ? (
            <EmptyState title="No people found" description="Create a profile or adjust filters." />
          ) : (
            <DataTable
              headers={["Name", "Role", "Category", "Artist", "Status", "Actions"]}
              minWidthClassName="min-w-[900px]"
            >
              {people.map((person) => (
                <tr key={person.id} className="bg-background border border-border">
                  <td className="px-3 py-3 text-sm text-foreground">{person.name}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{person.role}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      tone={person.category === "leadership" ? "published" : "draft"}
                      label={person.category}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={person.isArtist ? "approved" : "draft"} label={person.isArtist ? "artist" : "no"} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      tone={person.status === "published" ? "published" : person.status === "draft" ? "draft" : "failed"}
                      label={person.status}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPersonId(person.id)}>
                        <PencilLine size={12} /> Edit
                      </Button>
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleArchivePerson(person.id)}
                          disabled={archivePersonMutation.isPending}
                        >
                          <Trash2 size={12} /> Archive
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </AdminSectionCard>

      {selectedPersonId && (
        <AdminSectionCard title="Edit Person">
          {personQuery.isLoading ? (
            <p className="text-sm text-foreground-secondary">Loading person detail...</p>
          ) : personQuery.isError || !selectedPerson ? (
            <EmptyState title="Could not load selected person" description="Choose another profile and try again." />
          ) : (
            <form onSubmit={handleUpdatePerson} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={editForm.name}
                onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                className={adminInputClassName}
                placeholder="Full name"
              />
              <input
                value={editForm.role}
                onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                className={adminInputClassName}
                placeholder="Role / title"
              />
              <select
                value={editForm.category}
                onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value as PersonCategory }))}
                className={adminInputClassName}
              >
                <option value="leadership">Leadership</option>
                <option value="member">Member</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-foreground-secondary">
                <input
                  type="checkbox"
                  checked={editForm.isArtist}
                  onChange={(event) => setEditForm((current) => ({ ...current, isArtist: event.target.checked }))}
                />
                Artist profile
              </label>
              <input
                value={editForm.medium}
                onChange={(event) => setEditForm((current) => ({ ...current, medium: event.target.value }))}
                className={adminInputClassName}
                placeholder="Medium / specialty"
              />
              <select
                value={editForm.status}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, status: event.target.value as PersonFormState["status"] }))
                }
                className={adminInputClassName}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handlePersonImageUpload(file, "edit", "person-profile");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading profile image..."
                    : editImageMeta?.url
                      ? "Profile image upload ready."
                      : "Optional profile image."}
                </p>
              </div>
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handlePersonImageUpload(file, "edit", "person-cover");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading cover image..."
                    : editCoverMeta?.url
                      ? "Cover image upload ready."
                      : "Optional cover image."}
                </p>
              </div>
              <div className="md:col-span-2">
                <Textarea
                  value={editForm.bio}
                  onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Bio"
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  value={editForm.featuredWorks}
                  onChange={(event) => setEditForm((current) => ({ ...current, featuredWorks: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Featured works (comma or newline separated)"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedPersonId("");
                    setEditForm(defaultPersonForm);
                    setEditImageMeta(undefined);
                    setEditCoverMeta(undefined);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="accent" disabled={!canWrite || updatePersonMutation.isPending}>
                  {updatePersonMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
