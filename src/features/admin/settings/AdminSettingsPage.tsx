import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationBanner from "@/components/common/ConfirmationBanner";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { adminInputClassName, adminTextareaClassName } from "@/features/admin/shared/utils";
import { siteSettingsFormSchema } from "@/features/forms/schemas";
import { useAuth } from "@/features/auth/AuthContext";
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

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSettings(data);
  }, [data]);

  const updateField =
    (field: keyof SiteSettings) =>
    (eventInput: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = eventInput.target.value;
      setSaved(false);
      setSettings((current) => (current ? { ...current, [field]: value } : current));
    };

  const save = async (eventInput: FormEvent<HTMLFormElement>) => {
    eventInput.preventDefault();
    if (!settings) return;

    if (!canWrite) {
      toast.error("Your role has read-only access to site settings.");
      return;
    }

    const parsed = siteSettingsFormSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Please complete required settings fields.");
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
      });
      setSaved(true);
      toast.success("Settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings.");
    }
  };

  if (isLoading || !settings) {
    return <p className="text-sm text-foreground-secondary">Loading settings...</p>;
  }

  if (isError) {
    return <EmptyState title="Could not load settings" description="Verify admin site settings endpoint and active session." />;
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader
        title="Site Settings"
        subtitle="Manage global content, contact details, links, and SEO defaults. Moderators are read-only."
      />

      <AdminSectionCard title="Configuration Form">
        {!canWrite && <p className="mb-4 text-sm text-foreground-secondary">Your role is read-only for site settings.</p>}
        <form onSubmit={save} className="space-y-5">
          {saved && <ConfirmationBanner title="Settings Saved" message="Public site content now reflects backend-managed settings." tone="approved" />}

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
            <input className={adminInputClassName} value={settings.x} onChange={updateField("x")} placeholder="X/Twitter" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.facebook} onChange={updateField("facebook")} placeholder="Facebook" disabled={!canWrite} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={adminInputClassName} value={settings.heroTitle} onChange={updateField("heroTitle")} placeholder="Hero title" disabled={!canWrite} />
            <select className={adminInputClassName} value={settings.featuredEventId} onChange={updateField("featuredEventId")} disabled={!canWrite}>
              <option value="">No featured event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
            <textarea className={`${adminTextareaClassName} md:col-span-2`} value={settings.heroSubtitle} onChange={updateField("heroSubtitle")} placeholder="Hero subtitle" disabled={!canWrite} />
          </div>

          <input className={adminInputClassName} value={settings.defaultMetaTitle} onChange={updateField("defaultMetaTitle")} placeholder="Default meta title" disabled={!canWrite} />
          <textarea className={adminTextareaClassName} value={settings.defaultMetaDescription} onChange={updateField("defaultMetaDescription")} placeholder="Default description" disabled={!canWrite} />
          <input className={adminInputClassName} value={settings.defaultSocialPreviewImage} onChange={updateField("defaultSocialPreviewImage")} placeholder="Default social preview image" disabled={!canWrite} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className={adminInputClassName} value={settings.privacyPolicyLink} onChange={updateField("privacyPolicyLink")} placeholder="Privacy policy link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.termsLink} onChange={updateField("termsLink")} placeholder="Terms link" disabled={!canWrite} />
            <input className={adminInputClassName} value={settings.refundPolicyLink} onChange={updateField("refundPolicyLink")} placeholder="Refund policy link" disabled={!canWrite} />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="accent" disabled={!canWrite || mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </AdminSectionCard>
    </div>
  );
}
