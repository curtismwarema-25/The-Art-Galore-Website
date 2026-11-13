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

const settingsSections = [
  { id: "settings-general", label: "General" },
  { id: "settings-about", label: "About" },
  { id: "settings-contact", label: "Contact" },
  { id: "settings-legal", label: "Legal" },
  { id: "settings-homepage", label: "Homepage & SEO" },
  { id: "settings-payments", label: "Payments" },
] as const;

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
    if (!data || !siteSettingsFormSchema.safeParse(data).success) {
      setSettings(null);
      return;
    }

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
        aboutTitle: settings.aboutTitle,
        aboutIntro: settings.aboutIntro,
        aboutBody: settings.aboutBody,
        aboutImage: settings.aboutImage,
        contactTitle: settings.contactTitle,
        contactIntro: settings.contactIntro,
        privacyPolicyContent: settings.privacyPolicyContent,
        termsContent: settings.termsContent,
        refundPolicyContent: settings.refundPolicyContent,
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

  async function handleAboutImageUpload(file: File) {
    const validation = validateFile(file, "event-hero");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid image file.");
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync({ file, target: "event-hero" });
      setSaved(false);
      setSettings((current) => current ? { ...current, aboutImage: uploaded.url } : current);
      toast.success("About image uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    }
  }

  if (isLoading) {
    return <p role="status" className="text-sm text-foreground-secondary">Loading site settings…</p>;
  }

  if (isError) {
    return <EmptyState title="Site settings could not be loaded" description="Refresh the page or check your connection and try again." />;
  }

  if (!settings) {
    return <EmptyState title="Site settings are unavailable" description="The server returned incomplete settings. Refresh the page and try again." />;
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

          <nav aria-label="Site settings sections" className="sticky top-2 z-10 -mx-1 overflow-x-auto rounded-md border border-border bg-card/95 p-1 backdrop-blur-sm">
            <div className="flex min-w-max gap-1">
              {settingsSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-sm px-3 py-2 text-xs font-display uppercase tracking-[0.1em] text-foreground-secondary transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </nav>

          <div id="settings-general" className="scroll-mt-24 space-y-4">
            <h3 className="font-display text-lg text-foreground">General</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className={adminInputClassName} value={settings.siteName} onChange={updateField("siteName")} placeholder="Site name" aria-label="Site name" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.tagline} onChange={updateField("tagline")} placeholder="Tagline" aria-label="Tagline" disabled={!canWrite} />
            <textarea className={`${adminTextareaClassName} md:col-span-2`} value={settings.footerText} onChange={updateField("footerText")} placeholder="Footer text" aria-label="Footer text" disabled={!canWrite} />
            </div>
          </div>

          <div id="settings-about" className="scroll-mt-24 space-y-4 border-t border-border pt-5">
            <h3 className="font-display text-lg text-foreground">About page</h3>
            <input className={adminInputClassName} value={settings.aboutTitle} onChange={updateField("aboutTitle")} placeholder="About title" aria-label="About title" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.aboutIntro} onChange={updateField("aboutIntro")} placeholder="About introduction" aria-label="About introduction" disabled={!canWrite} />
            <textarea className={`${adminTextareaClassName} min-h-48`} value={settings.aboutBody} onChange={updateField("aboutBody")} placeholder="About body; separate paragraphs with blank lines" aria-label="About body" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.aboutImage ?? ""} onChange={updateField("aboutImage")} placeholder="About image URL or path" aria-label="About image URL or path" disabled={!canWrite} />
            <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload About image" className={adminFileInputClassName} disabled={!canWrite || uploadMediaMutation.isPending} onChange={(eventInput) => { const file = eventInput.target.files?.[0]; if (file) void handleAboutImageUpload(file); }} />
          </div>

          <div id="settings-contact" className="scroll-mt-24 space-y-4 border-t border-border pt-5">
            <h3 className="font-display text-lg text-foreground">Contact page</h3>
            <input className={adminInputClassName} value={settings.contactTitle} onChange={updateField("contactTitle")} placeholder="Contact title" aria-label="Contact title" disabled={!canWrite} />
            <textarea className={adminTextareaClassName} value={settings.contactIntro} onChange={updateField("contactIntro")} placeholder="Contact introduction" aria-label="Contact introduction" disabled={!canWrite} />
          </div>

          <div id="settings-legal" className="scroll-mt-24 space-y-4 border-t border-border pt-5">
            <h3 className="font-display text-lg text-foreground">Public legal page content</h3>
            <p className="text-xs text-foreground-secondary">These are editable working drafts. Obtain legal review before treating them as approved legal advice.</p>
            <textarea className={`${adminTextareaClassName} min-h-64`} value={settings.privacyPolicyContent} onChange={updateField("privacyPolicyContent")} placeholder="Privacy policy content" aria-label="Privacy policy content" disabled={!canWrite} />
            <textarea className={`${adminTextareaClassName} min-h-64`} value={settings.termsContent} onChange={updateField("termsContent")} placeholder="Terms and conditions content" aria-label="Terms and conditions content" disabled={!canWrite} />
            <textarea className={`${adminTextareaClassName} min-h-64`} value={settings.refundPolicyContent} onChange={updateField("refundPolicyContent")} placeholder="Ticket refund and cancellation policy content" aria-label="Ticket refund and cancellation policy content" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className={adminInputClassName} value={settings.contactEmail} onChange={updateField("contactEmail")} placeholder="Email" aria-label="Contact email" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.contactPhone} onChange={updateField("contactPhone")} placeholder="Phone" aria-label="Contact phone" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.whatsappLink} onChange={updateField("whatsappLink")} placeholder="WhatsApp link" aria-label="WhatsApp link" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <input className={adminInputClassName} value={settings.instagram} onChange={updateField("instagram")} placeholder="Instagram" aria-label="Instagram URL" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.tiktok} onChange={updateField("tiktok")} placeholder="TikTok" aria-label="TikTok URL" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.x} onChange={updateField("x")} placeholder="X profile URL" aria-label="X profile URL" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.facebook} onChange={updateField("facebook")} placeholder="Facebook" aria-label="Facebook URL" disabled={!canWrite} />
          </div>

          <div id="settings-homepage" className="scroll-mt-24 space-y-4 border-t border-border pt-5">
            <h3 className="font-display text-lg text-foreground">Homepage and search previews</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={adminInputClassName} value={settings.heroTitle} onChange={updateField("heroTitle")} placeholder="Hero title" aria-label="Hero title" disabled={!canWrite} />
            <select className={adminInputClassName} value={settings.featuredEventId} onChange={updateField("featuredEventId")} disabled={!canWrite} aria-label="Featured event">
              <option value="">No featured event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <textarea className={`${adminTextareaClassName} md:col-span-2`} value={settings.heroSubtitle} onChange={updateField("heroSubtitle")} placeholder="Hero subtitle" aria-label="Hero subtitle" disabled={!canWrite} />
            </div>

            <input className={adminInputClassName} value={settings.defaultMetaTitle} onChange={updateField("defaultMetaTitle")} placeholder="Search preview title" aria-label="Search preview title" disabled={!canWrite} />
            <textarea className={adminTextareaClassName} value={settings.defaultMetaDescription} onChange={updateField("defaultMetaDescription")} placeholder="Search preview description" aria-label="Search preview description" disabled={!canWrite} />
          </div>

          <div className="space-y-2">
            <input
              className={adminInputClassName}
              value={settings.defaultSocialPreviewImage}
              readOnly
              placeholder="Social preview image (set by upload)"
              aria-label="Default social preview image"
              disabled
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Upload default social preview image"
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
            <input className={adminInputClassName} value={settings.privacyPolicyLink} onChange={updateField("privacyPolicyLink")} placeholder="Privacy policy link" aria-label="Privacy policy link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.termsLink} onChange={updateField("termsLink")} placeholder="Terms link" aria-label="Terms link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.refundPolicyLink} onChange={updateField("refundPolicyLink")} placeholder="Refund policy link" aria-label="Refund policy link" disabled={!canWrite} />
          </div>

          <div id="settings-payments" className="scroll-mt-24 border-t border-border pt-5">
            <h3 className="mb-4 font-display text-lg text-foreground">Payment fallback</h3>
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
            <input className={adminInputClassName} value={settings.mpesaComingSoonMessage} onChange={updateField("mpesaComingSoonMessage")} placeholder="M-Pesa coming soon message" aria-label="M-Pesa coming soon message" disabled={!canWrite} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.mpesaPaybill ?? ""} onChange={updateField("mpesaPaybill")} placeholder="M-Pesa paybill" aria-label="M-Pesa paybill" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.supportContactText ?? ""} onChange={updateField("supportContactText")} placeholder="Support contact text" aria-label="Support contact text" disabled={!canWrite} />
            </div>
            <textarea className={adminTextareaClassName} value={settings.mpesaAccountInstructions ?? ""} onChange={updateField("mpesaAccountInstructions")} placeholder="M-Pesa account instructions" aria-label="M-Pesa account instructions" disabled={!canWrite} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.bankName ?? ""} onChange={updateField("bankName")} placeholder="Bank name" aria-label="Bank name" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.bankBranch ?? ""} onChange={updateField("bankBranch")} placeholder="Bank branch" aria-label="Bank branch" disabled={!canWrite} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className={adminInputClassName} value={settings.bankAccountName ?? ""} onChange={updateField("bankAccountName")} placeholder="Bank account name" aria-label="Bank account name" disabled={!canWrite} />
              <input className={adminInputClassName} value={settings.bankAccountNumber ?? ""} onChange={updateField("bankAccountNumber")} placeholder="Bank account number" aria-label="Bank account number" disabled={!canWrite} />
            </div>
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
