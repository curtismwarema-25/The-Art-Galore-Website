import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationBanner from "@/components/common/ConfirmationBanner";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import {
  adminCheckboxClassName,
  adminFileInputClassName,
  adminInputClassName,
  adminTextareaClassName,
} from "@/features/admin/shared/utils";
import { siteSettingsFormSchema } from "@/features/forms/schemas";
import { useAuth } from "@/features/auth/useAuth";
import { validateFile } from "@/features/uploads/uploadService";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import { useUpdateSiteSettingsMutation } from "@/hooks/mutations/useUpdateSiteSettingsMutation";
import { useAdminEventsQuery } from "@/hooks/queries/useAdminEventsQuery";
import { useAdminSiteSettingsQuery } from "@/hooks/queries/useAdminSiteSettingsQuery";
import type { SiteSettings } from "@/types/models";
import { toast } from "@/components/ui/sonner";

export default function AdminSettingsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(["admin", "staff"]);

  const { data, isLoading, isError } = useAdminSiteSettingsQuery();
  const { data: events = [] } = useAdminEventsQuery();
  const mutation = useUpdateSiteSettingsMutation();
  const uploadMediaMutation = useUploadMediaMutation();

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSettings(data);
  }, [data]);

  const updateField =
    (field: keyof SiteSettings) =>
    (eventInput: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const rawTarget = eventInput.target;
      const value =
        rawTarget instanceof HTMLInputElement && rawTarget.type === "checkbox"
          ? rawTarget.checked
          : rawTarget.value;
      setSaved(false);
      setSettings((current) => (current ? { ...current, [field]: value } : current));
    };

  const save = async (eventInput: FormEvent<HTMLFormElement>) => {
    eventInput.preventDefault();
    if (!settings) return;

    if (!canWrite) {
      toast.error("You do not have permission to change site settings.");
      return;
    }

    const parsed = siteSettingsFormSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Check the required settings fields and try again.");
      return;
    }

    try {
      await mutation.mutateAsync({
        siteName: settings.siteName,
        tagline: settings.tagline,
        footerText: settings.footerText,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        whatsappLink: settings.whatsappLink,
        instagram: settings.instagram,
        tiktok: settings.tiktok,
        x: settings.x,
        facebook: settings.facebook,
        heroTitle: settings.heroTitle,
        heroSubtitle: settings.heroSubtitle,
        featuredEventId: settings.featuredEventId,
        defaultMetaTitle: settings.defaultMetaTitle,
        defaultMetaDescription: settings.defaultMetaDescription,
        defaultSocialPreviewImage: settings.defaultSocialPreviewImage,
        privacyPolicyLink: settings.privacyPolicyLink,
        termsLink: settings.termsLink,
        refundPolicyLink: settings.refundPolicyLink,
        manualPaymentEnabled: settings.manualPaymentEnabled,
        bankAccountName: settings.bankAccountName,
        bankAccountNumber: settings.bankAccountNumber,
        bankName: settings.bankName,
        bankBranch: settings.bankBranch,
        mpesaPaybill: settings.mpesaPaybill,
        mpesaAccountInstructions: settings.mpesaAccountInstructions,
        supportContactText: settings.supportContactText,
        mpesaComingSoonMessage: settings.mpesaComingSoonMessage,
      });
      setSaved(true);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings could not be saved. Try again.");
    }
  };

  async function handleDefaultPreviewUpload(file: File) {
    const validation = validateFile(file, "event-hero");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid image file.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({
        file,
        target: "event-hero",
      });

      setSaved(false);
      setSettings((current) =>
        current
          ? {
              ...current,
              defaultSocialPreviewImage: uploaded.url,
            }
          : current,
      );
      toast.success("Default social preview image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    }
  }

  if (isLoading || !settings) {
    return <p className="text-sm text-foreground-secondary">Loading site settings…</p>;
  }

  if (isError) {
    return <EmptyState title="Site settings could not be loaded" description="Check your connection and try again." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Site settings"
        subtitle="Update public site content, contact details, links, and search and social previews. Moderators can view settings but cannot change them."
      />

      <AdminSectionCard title="Public site content">
        {!canWrite && <p className="mb-4 text-sm text-foreground-secondary">You can view these settings, but your role cannot change them.</p>}
        <form onSubmit={save} className="space-y-5">
          {saved && <ConfirmationBanner title="Settings saved" message="Your changes are now in effect on the public site." tone="approved" />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={adminInputClassName} value={settings.siteName} onChange={updateField("siteName")} placeholder="Site name" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.tagline} onChange={updateField("tagline")} placeholder="Tagline" disabled={!canWrite} />
            <textarea className={`${adminTextareaClassName} md:col-span-2`} value={settings.footerText} onChange={updateField("footerText")} placeholder="Footer text" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className={adminInputClassName} value={settings.contactEmail} onChange={updateField("contactEmail")} placeholder="Email" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.contactPhone} onChange={updateField("contactPhone")} placeholder="Phone" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.whatsappLink} onChange={updateField("whatsappLink")} placeholder="WhatsApp link" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input className={adminInputClassName} value={settings.instagram} onChange={updateField("instagram")} placeholder="Instagram" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.tiktok} onChange={updateField("tiktok")} placeholder="TikTok" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.x} onChange={updateField("x")} placeholder="X profile URL" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.facebook} onChange={updateField("facebook")} placeholder="Facebook" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={adminInputClassName} value={settings.heroTitle} onChange={updateField("heroTitle")} placeholder="Hero title" disabled={!canWrite} />
            <select className={adminInputClassName} value={settings.featuredEventId} onChange={updateField("featuredEventId")} disabled={!canWrite} aria-label="Featured event">
              <option value="">No featured event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <textarea className={`${adminTextareaClassName} md:col-span-2`} value={settings.heroSubtitle} onChange={updateField("heroSubtitle")} placeholder="Hero subtitle" disabled={!canWrite} />
          </div>

          <input className={adminInputClassName} value={settings.defaultMetaTitle} onChange={updateField("defaultMetaTitle")} placeholder="Search preview title" disabled={!canWrite} />
          <textarea className={adminTextareaClassName} value={settings.defaultMetaDescription} onChange={updateField("defaultMetaDescription")} placeholder="Search preview description" disabled={!canWrite} />
          <div className="space-y-2">
            <input
              className={adminInputClassName}
              value={settings.defaultSocialPreviewImage}
              readOnly
              placeholder="Social preview image (set by upload)"
              disabled
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFileInputClassName}
              disabled={!canWrite || uploadMediaMutation.isPending}
              onChange={(eventInput) => {
                const file = eventInput.target.files?.[0];
                if (!file) return;
                void handleDefaultPreviewUpload(file);
              }}
            />
            <p className="text-xs text-foreground-secondary">
              {uploadMediaMutation.isPending
                ? "Uploading preview image…"
                : settings.defaultSocialPreviewImage
                  ? "Preview image ready."
                  : "Upload an image to set social preview metadata."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className={adminInputClassName} value={settings.privacyPolicyLink} onChange={updateField("privacyPolicyLink")} placeholder="Privacy policy link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.termsLink} onChange={updateField("termsLink")} placeholder="Terms link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.refundPolicyLink} onChange={updateField("refundPolicyLink")} placeholder="Refund policy link" disabled={!canWrite} />
          </div>

          <div className="border border-border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-foreground">Manual payment fallback</p>
              <label className="text-xs text-foreground-secondary flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.manualPaymentEnabled}
                  onChange={updateField("manualPaymentEnabled")}
                  disabled={!canWrite}
                  className={adminCheckboxClassName}
                />
                Enabled
              </label>
            </div>
            <input className={adminInputClassName} value={settings.mpesaComingSoonMessage} onChange={updateField("mpesaComingSoonMessage")} placeholder="M-Pesa coming soon message" disabled={!canWrite} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.mpesaPaybill ?? ""} onChange={updateField("mpesaPaybill")} placeholder="M-Pesa paybill" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.supportContactText ?? ""} onChange={updateField("supportContactText")} placeholder="Support contact text" disabled={!canWrite} />
            </div>
            <textarea className={adminTextareaClassName} value={settings.mpesaAccountInstructions ?? ""} onChange={updateField("mpesaAccountInstructions")} placeholder="M-Pesa account instructions" disabled={!canWrite} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.bankName ?? ""} onChange={updateField("bankName")} placeholder="Bank name" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.bankBranch ?? ""} onChange={updateField("bankBranch")} placeholder="Bank branch" disabled={!canWrite} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.bankAccountName ?? ""} onChange={updateField("bankAccountName")} placeholder="Bank account name" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.bankAccountNumber ?? ""} onChange={updateField("bankAccountNumber")} placeholder="Bank account number" disabled={!canWrite} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || mutation.isPending}>
              {mutation.isPending ? "Saving changes…" : "Save changes"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>
    </div>
  );
}
