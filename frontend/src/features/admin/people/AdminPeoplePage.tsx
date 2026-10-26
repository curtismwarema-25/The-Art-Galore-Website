import { Dispatch, FormEvent, SetStateAction, useEffect, useMemo, useState } from "react";
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
import {
  adminCheckboxClassName,
  adminCheckboxFieldClassName,
  adminFileInputClassName,
  adminInputClassName,
  adminTextareaClassName,
  formatAdminStatus,
} from "@/features/admin/shared/utils";
import { useAuth } from "@/features/auth/useAuth";
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
  preferredName: string;
  pronunciation: string;
  email: string;
  phone: string;
  city: string;
  preferredContactMethod: string;
  role: string;
  category: PersonCategory;
  isArtist: boolean;
  shortBio: string;
  medium: string;
  primaryArtForm: string;
  secondaryArtForm: string;
  yearsPracticing: string;
  bio: string;
  quote: string;
  artistStatement: string;
  instagram: string;
  tiktok: string;
  facebook: string;
  x: string;
  youtube: string;
  website: string;
  eventRoles: string;
  interestedInCollaborating: boolean;
  additionalWorkUrl: string;
  profilePhotoUrl: string;
  portfolioImagesUrl: string;
  consentGiven: boolean;
  status: "draft" | "published" | "archived";
  featuredWorks: string;
};

const personFormSchema = z.object({
  name: z.string().trim().min(2),
  preferredName: z.string().trim().optional(),
  pronunciation: z.string().trim().optional(),
  email: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  preferredContactMethod: z.string().trim().optional(),
  role: z.string().trim().min(2),
  category: z.enum(["leadership", "member"]),
  isArtist: z.boolean(),
  shortBio: z.string().trim().optional(),
  medium: z.string().trim().min(2),
  primaryArtForm: z.string().trim().optional(),
  secondaryArtForm: z.string().trim().optional(),
  yearsPracticing: z.string().trim().optional(),
  bio: z.string().trim().min(10),
  quote: z.string().trim().optional(),
  artistStatement: z.string().trim().optional(),
  instagram: z.string().trim().optional(),
  tiktok: z.string().trim().optional(),
  facebook: z.string().trim().optional(),
  x: z.string().trim().optional(),
  youtube: z.string().trim().optional(),
  website: z.string().trim().optional(),
  eventRoles: z.string().optional(),
  interestedInCollaborating: z.boolean(),
  additionalWorkUrl: z.string().trim().optional(),
  profilePhotoUrl: z.string().trim().optional(),
  portfolioImagesUrl: z.string().trim().optional(),
  consentGiven: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  featuredWorks: z.string().optional(),
});

const defaultPersonForm: PersonFormState = {
  name: "",
  preferredName: "",
  pronunciation: "",
  email: "",
  phone: "",
  city: "",
  preferredContactMethod: "",
  role: "",
  category: "member",
  isArtist: true,
  shortBio: "",
  medium: "Mixed Media",
  primaryArtForm: "",
  secondaryArtForm: "",
  yearsPracticing: "",
  bio: "",
  quote: "",
  artistStatement: "",
  instagram: "",
  tiktok: "",
  facebook: "",
  x: "",
  youtube: "",
  website: "",
  eventRoles: "",
  interestedInCollaborating: false,
  additionalWorkUrl: "",
  profilePhotoUrl: "",
  portfolioImagesUrl: "",
  consentGiven: true,
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

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildPersonPayload(parsed: PersonFormState) {
  return {
    name: parsed.name.trim(),
    preferredName: optionalValue(parsed.preferredName),
    pronunciation: optionalValue(parsed.pronunciation),
    email: optionalValue(parsed.email),
    phone: optionalValue(parsed.phone),
    city: optionalValue(parsed.city),
    preferredContactMethod: optionalValue(parsed.preferredContactMethod),
    role: parsed.role.trim(),
    category: parsed.category,
    isArtist: parsed.isArtist,
    shortBio: optionalValue(parsed.shortBio),
    medium: parsed.medium.trim(),
    primaryArtForm: optionalValue(parsed.primaryArtForm),
    secondaryArtForm: optionalValue(parsed.secondaryArtForm),
    yearsPracticing: optionalValue(parsed.yearsPracticing),
    bio: parsed.bio.trim(),
    quote: optionalValue(parsed.quote),
    artistStatement: optionalValue(parsed.artistStatement),
    socials: {
      instagram: optionalValue(parsed.instagram),
      tiktok: optionalValue(parsed.tiktok),
      facebook: optionalValue(parsed.facebook),
      x: optionalValue(parsed.x),
      youtube: optionalValue(parsed.youtube),
      website: optionalValue(parsed.website),
    },
    eventRoles: splitList(parsed.eventRoles),
    interestedInCollaborating: parsed.interestedInCollaborating,
    additionalWorkUrl: optionalValue(parsed.additionalWorkUrl),
    mediaReferences: {
      profilePhotoUrl: optionalValue(parsed.profilePhotoUrl),
      portfolioImagesUrl: optionalValue(parsed.portfolioImagesUrl),
    },
    consentGiven: parsed.consentGiven,
    status: parsed.status,
    featuredWorks: splitList(parsed.featuredWorks ?? ""),
  };
}

function mapPersonToForm(person: PersonRecord): PersonFormState {
  return {
    name: person.name,
    preferredName: person.preferredName ?? "",
    pronunciation: person.pronunciation ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    city: person.city ?? "",
    preferredContactMethod: person.preferredContactMethod ?? "",
    role: person.role,
    category: person.category,
    isArtist: person.isArtist,
    shortBio: person.shortBio ?? "",
    medium: person.medium,
    primaryArtForm: person.primaryArtForm ?? "",
    secondaryArtForm: person.secondaryArtForm ?? "",
    yearsPracticing: person.yearsPracticing ?? "",
    bio: person.bio,
    quote: person.quote ?? "",
    artistStatement: person.artistStatement ?? "",
    instagram: person.socials.instagram ?? "",
    tiktok: person.socials.tiktok ?? "",
    facebook: person.socials.facebook ?? "",
    x: person.socials.x ?? "",
    youtube: person.socials.youtube ?? "",
    website: person.socials.website ?? "",
    eventRoles: joinList(person.eventRoles),
    interestedInCollaborating: Boolean(person.interestedInCollaborating),
    additionalWorkUrl: person.additionalWorkUrl ?? "",
    profilePhotoUrl: person.mediaReferences?.profilePhotoUrl ?? "",
    portfolioImagesUrl: person.mediaReferences?.portfolioImagesUrl ?? "",
    consentGiven: person.consentGiven ?? true,
    status: person.status === "draft" || person.status === "archived" ? person.status : "published",
    featuredWorks: joinList(person.featuredWorks),
  };
}

type PersonFormFieldsProps = {
  form: PersonFormState;
  setForm: Dispatch<SetStateAction<PersonFormState>>;
};

function PersonFormFields({ form, setForm }: PersonFormFieldsProps) {
  return (
    <>
      <input
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        className={adminInputClassName}
        placeholder="Full name"
      />
      <input
        value={form.preferredName}
        onChange={(event) => setForm((current) => ({ ...current, preferredName: event.target.value }))}
        className={adminInputClassName}
        placeholder="Preferred / stage name"
      />
      <input
        value={form.role}
        onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
        className={adminInputClassName}
        placeholder="Organization role / title"
      />
      <input
        value={form.pronunciation}
        onChange={(event) => setForm((current) => ({ ...current, pronunciation: event.target.value }))}
        className={adminInputClassName}
        placeholder="Pronunciation"
      />
      <select
        value={form.category}
        onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as PersonCategory }))}
        className={adminInputClassName}
        aria-label="Profile category"
      >
        <option value="leadership">Leadership</option>
        <option value="member">Member</option>
      </select>
      <select
        value={form.status}
        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PersonFormState["status"] }))}
        className={adminInputClassName}
        aria-label="Profile status"
      >
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </select>
      <label className={adminCheckboxFieldClassName}>
        <input
          type="checkbox"
          checked={form.isArtist}
          onChange={(event) => setForm((current) => ({ ...current, isArtist: event.target.checked }))}
          className={adminCheckboxClassName}
        />
        Artist profile
      </label>
      <label className={adminCheckboxFieldClassName}>
        <input
          type="checkbox"
          checked={form.consentGiven}
          onChange={(event) => setForm((current) => ({ ...current, consentGiven: event.target.checked }))}
          className={adminCheckboxClassName}
        />
        Publish consent
      </label>
      <input
        value={form.medium}
        onChange={(event) => setForm((current) => ({ ...current, medium: event.target.value }))}
        className={adminInputClassName}
        placeholder="Medium / specialty"
      />
      <input
        value={form.primaryArtForm}
        onChange={(event) => setForm((current) => ({ ...current, primaryArtForm: event.target.value }))}
        className={adminInputClassName}
        placeholder="Primary art form"
      />
      <input
        value={form.secondaryArtForm}
        onChange={(event) => setForm((current) => ({ ...current, secondaryArtForm: event.target.value }))}
        className={adminInputClassName}
        placeholder="Secondary art form"
      />
      <input
        value={form.yearsPracticing}
        onChange={(event) => setForm((current) => ({ ...current, yearsPracticing: event.target.value }))}
        className={adminInputClassName}
        placeholder="Years practicing"
      />
      <input
        value={form.city}
        onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
        className={adminInputClassName}
        placeholder="City / location"
      />
      <input
        value={form.preferredContactMethod}
        onChange={(event) => setForm((current) => ({ ...current, preferredContactMethod: event.target.value }))}
        className={adminInputClassName}
        placeholder="Preferred contact method"
      />
      <input
        value={form.email}
        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        className={adminInputClassName}
        placeholder="Admin-only email"
      />
      <input
        value={form.phone}
        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
        className={adminInputClassName}
        placeholder="Admin-only phone"
      />
      <input
        value={form.instagram}
        onChange={(event) => setForm((current) => ({ ...current, instagram: event.target.value }))}
        className={adminInputClassName}
        placeholder="Instagram"
      />
      <input
        value={form.tiktok}
        onChange={(event) => setForm((current) => ({ ...current, tiktok: event.target.value }))}
        className={adminInputClassName}
        placeholder="TikTok"
      />
      <input
        value={form.facebook}
        onChange={(event) => setForm((current) => ({ ...current, facebook: event.target.value }))}
        className={adminInputClassName}
        placeholder="Facebook"
      />
      <input
        value={form.x}
        onChange={(event) => setForm((current) => ({ ...current, x: event.target.value }))}
        className={adminInputClassName}
        placeholder="X / Twitter"
      />
      <input
        value={form.youtube}
        onChange={(event) => setForm((current) => ({ ...current, youtube: event.target.value }))}
        className={adminInputClassName}
        placeholder="YouTube"
      />
      <input
        value={form.website}
        onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
        className={adminInputClassName}
        placeholder="Website / portfolio"
      />
      <div className="md:col-span-2">
        <Textarea
          value={form.shortBio}
          onChange={(event) => setForm((current) => ({ ...current, shortBio: event.target.value }))}
          className={adminTextareaClassName}
          placeholder="Short bio"
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          value={form.bio}
          onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
          className={adminTextareaClassName}
          placeholder="Long bio"
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          value={form.artistStatement}
          onChange={(event) => setForm((current) => ({ ...current, artistStatement: event.target.value }))}
          className={adminTextareaClassName}
          placeholder="Artist statement"
        />
      </div>
      <div className="md:col-span-2">
        <input
          value={form.quote}
          onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
          className={adminInputClassName}
          placeholder="Quote / tagline"
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          value={form.eventRoles}
          onChange={(event) => setForm((current) => ({ ...current, eventRoles: event.target.value }))}
          className={adminTextareaClassName}
          placeholder="Event roles (comma or newline separated)"
        />
      </div>
      <label className={adminCheckboxFieldClassName}>
        <input
          type="checkbox"
          checked={form.interestedInCollaborating}
          onChange={(event) => setForm((current) => ({ ...current, interestedInCollaborating: event.target.checked }))}
          className={adminCheckboxClassName}
        />
        Interested in future collaborations
      </label>
      <input
        value={form.additionalWorkUrl}
        onChange={(event) => setForm((current) => ({ ...current, additionalWorkUrl: event.target.value }))}
        className={adminInputClassName}
        placeholder="Additional work URL"
      />
      <input
        value={form.profilePhotoUrl}
        onChange={(event) => setForm((current) => ({ ...current, profilePhotoUrl: event.target.value }))}
        className={adminInputClassName}
        placeholder="Source profile photo URL"
      />
      <input
        value={form.portfolioImagesUrl}
        onChange={(event) => setForm((current) => ({ ...current, portfolioImagesUrl: event.target.value }))}
        className={adminInputClassName}
        placeholder="Source portfolio images URL"
      />
      <div className="md:col-span-2">
        <Textarea
          value={form.featuredWorks}
          onChange={(event) => setForm((current) => ({ ...current, featuredWorks: event.target.value }))}
          className={adminTextareaClassName}
          placeholder="Featured works (comma or newline separated)"
        />
      </div>
    </>
  );
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
    if (!selectedPersonId) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("admin-person-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedPersonId]);

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
      toast.error("You do not have permission to edit profiles.");
      return;
    }

    const parsed = personFormSchema.safeParse(createForm);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Add a name and role before saving the profile.");
      return;
    }

    try {
      const created = await createPersonMutation.mutateAsync({
        ...buildPersonPayload(createForm),
        image: createImageMeta?.url,
        imageMeta: createImageMeta,
        coverImage: createCoverMeta?.url,
        coverImageMeta: createCoverMeta,
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
      toast.error("You do not have permission to edit profiles.");
      return;
    }

    if (!selectedPersonId) return;

    const parsed = personFormSchema.safeParse(editForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Add a name and role before saving the profile.");
      return;
    }

    try {
      await updatePersonMutation.mutateAsync({
        id: selectedPersonId,
        input: {
          ...buildPersonPayload(editForm),
          image: editImageMeta?.url,
          imageMeta: editImageMeta,
          coverImage: editCoverMeta?.url,
          coverImageMeta: editCoverMeta,
        },
      });

      toast.success("Person profile updated.");
    } catch (error) {
      toast.error(formatError(error));
    }
  }

  async function handleArchivePerson(id: string) {
    if (!canWrite) {
      toast.error("You do not have permission to edit profiles.");
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
    return <p className="text-sm text-foreground-secondary">Loading profiles…</p>;
  }

  if (peopleQuery.isError) {
    return <EmptyState title="Profiles could not be loaded" description="Check your connection and try again." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="People and artists"
        subtitle="Manage artist and team profiles shown on the public site. Moderators can view profiles but cannot edit them."
      />

      <AdminSectionCard title="Create profile">
        {!canWrite && (
          <p className="text-sm text-foreground-secondary mb-4">
            You can view profiles, but your account cannot edit them.
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
            aria-label="Profile category"
          >
            <option value="leadership">Leadership</option>
            <option value="member">Member</option>
          </select>
          <label className={adminCheckboxFieldClassName}>
            <input
              type="checkbox"
              checked={createForm.isArtist}
              onChange={(event) => setCreateForm((current) => ({ ...current, isArtist: event.target.checked }))}
              className={adminCheckboxClassName}
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
            aria-label="Profile status"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFileInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handlePersonImageUpload(file, "create", "person-profile");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                    ? "Uploading profile image…"
                : createImageMeta?.url
                  ? "Profile image upload ready."
                  : "Optional profile image."}
            </p>
          </div>
          <div className="md:col-span-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFileInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handlePersonImageUpload(file, "create", "person-cover");
              }}
            />
            <p className="mt-1 text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                    ? "Uploading cover image…"
                : createCoverMeta?.url
                  ? "Cover image upload ready."
                  : "Optional cover image."}
            </p>
          </div>
          <div className="md:col-span-2">
            <Textarea
              value={createForm.bio}
              onChange={(event) => setCreateForm((current) => ({ ...current, bio: event.target.value }))}
              className={adminTextareaClassName}
              placeholder="Bio"
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              value={createForm.featuredWorks}
              onChange={(event) => setCreateForm((current) => ({ ...current, featuredWorks: event.target.value }))}
              className={adminTextareaClassName}
              placeholder="Featured works (comma or newline separated)"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || createPersonMutation.isPending}>
              {createPersonMutation.isPending ? "Creating profile…" : "Create profile"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>

      <AdminSectionCard title="People directory">
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
              minWidthClassName="min-w-[760px] md:min-w-[900px]"
            >
              {people.map((person) => (
                <tr
                  key={person.id}
                  className={`cursor-pointer border border-border transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${selectedPersonId === person.id ? "bg-accent/10" : "bg-background"}`}
                  aria-selected={selectedPersonId === person.id}
                  tabIndex={0}
                  onClick={(event) => {
                    if ((event.target as HTMLElement).closest("a,button,input,select,textarea")) return;
                    setSelectedPersonId(person.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedPersonId(person.id);
                    }
                  }}
                >
                  <td className="px-3 py-3 text-sm text-foreground">{person.name}</td>
                  <td className="px-3 py-3 text-sm text-foreground-secondary">{person.role}</td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      tone={person.category === "leadership" ? "published" : "draft"}
                      label={formatAdminStatus(person.category)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge tone={person.isArtist ? "approved" : "draft"} label={person.isArtist ? "Artist" : "Not an artist"} />
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge
                      tone={person.status === "published" ? "published" : person.status === "draft" ? "draft" : "failed"}
                      label={formatAdminStatus(person.status)}
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
                          <Trash2 size={12} /> Archive profile
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
        <AdminSectionCard title="Edit profile">
          {personQuery.isLoading ? (
            <p className="text-sm text-foreground-secondary">Loading profile…</p>
          ) : personQuery.isError || !selectedPerson ? (
            <EmptyState title="Profile could not be loaded" description="Choose another profile to try again." />
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
                aria-label="Profile category"
              >
                <option value="leadership">Leadership</option>
                <option value="member">Member</option>
              </select>
              <label className={adminCheckboxFieldClassName}>
                <input
                  type="checkbox"
                  checked={editForm.isArtist}
                  onChange={(event) => setEditForm((current) => ({ ...current, isArtist: event.target.checked }))}
                  className={adminCheckboxClassName}
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
                aria-label="Profile status"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminFileInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handlePersonImageUpload(file, "edit", "person-profile");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading profile image…"
                    : editImageMeta?.url
                      ? "Profile image upload ready."
                      : "Optional profile image."}
                </p>
              </div>
              <div className="md:col-span-2">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={adminFileInputClassName}
                  disabled={!canWrite || uploadMediaMutation.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void handlePersonImageUpload(file, "edit", "person-cover");
                  }}
                />
                <p className="mt-1 text-xs text-foreground-secondary">
                  {uploadMediaMutation.isPending
                    ? "Uploading cover image…"
                    : editCoverMeta?.url
                      ? "Cover image upload ready."
                      : "Optional cover image."}
                </p>
              </div>
              <div className="md:col-span-2">
                <Textarea
                  value={editForm.bio}
                  onChange={(event) => setEditForm((current) => ({ ...current, bio: event.target.value }))}
                  className={adminTextareaClassName}
                  placeholder="Bio"
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  value={editForm.featuredWorks}
                  onChange={(event) => setEditForm((current) => ({ ...current, featuredWorks: event.target.value }))}
                  className={adminTextareaClassName}
                  placeholder="Featured works (comma or newline separated)"
                />
              </div>
              {(selectedPerson?.importedFrom || selectedPerson?.importNotes) && (
                <div className="md:col-span-2 border-t border-border pt-4">
                  <h3 className="text-sm font-display uppercase tracking-wider mb-3 text-foreground-secondary">Import Metadata</h3>
                  {selectedPerson?.importedFrom && (
                    <div className="mb-3">
                      <p className="text-xs font-display text-foreground-secondary mb-1">Source</p>
                      <p className="text-sm text-foreground">{selectedPerson.importedFrom}</p>
                    </div>
                  )}
                  {selectedPerson?.importNotes && (
                    <div>
                      <p className="text-xs font-display text-foreground-secondary mb-1">Notes</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{selectedPerson.importNotes}</p>
                    </div>
                  )}
                </div>
              )}
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
                  {updatePersonMutation.isPending ? "Saving changes…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </AdminSectionCard>
      )}
    </div>
  );
}
