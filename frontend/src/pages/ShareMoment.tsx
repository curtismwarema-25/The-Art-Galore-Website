import { useEffect, useState } from "react";
import { Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";
import ConfirmationBanner from "@/components/common/ConfirmationBanner";
import UploadCard from "@/components/cards/UploadCard";
import { communityUploadFormSchema } from "@/features/forms/schemas";
import { createPreviewUrl, revokePreviewUrl, validateFile } from "@/features/uploads/uploadService";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import { useSubmitCommunityUploadMutation } from "@/hooks/mutations/useUploadMutations";
import { useApprovedUploadsQuery } from "@/hooks/queries/useApprovedUploadsQuery";
import { useEventsQuery } from "@/hooks/queries/useEventsQuery";
import type { UploadState } from "@/types/models";
import { toast } from "@/components/ui/sonner";
import {
  formFileInputClassName,
  formHelperTextClassName,
  formInputClassName,
  formLabelClassName,
  formSelectClassName,
} from "@/lib/formStyles";

export default function ShareMoment() {
  const { data: events = [] } = useEventsQuery();
  const { data: approvedUploads = [], isLoading: isApprovedUploadsLoading } = useApprovedUploadsQuery();
  const submitUploadMutation = useSubmitCommunityUploadMutation();
  const uploadMediaMutation = useUploadMediaMutation();

  const [alias, setAlias] = useState("");
  const [eventId, setEventId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    if (!eventId && events[0]) {
      setEventId(events[0].id);
    }
  }, [eventId, events]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(preview);
    };
  }, [preview]);

  const submitUpload = async () => {
    if (!file) {
      setUploadState("failed");
      toast.error("Add an image before submitting.");
      return;
    }

    const parsed = communityUploadFormSchema.safeParse({ alias, eventId, file, consentGiven });
    if (!parsed.success) {
      setUploadState("failed");
      toast.error("Add alias, event, image, and consent before submitting.");
      return;
    }

    setUploadState("uploading");

    try {
      const uploadedMedia = await uploadMediaMutation.mutateAsync({
        file,
        target: "community",
      });

      await submitUploadMutation.mutateAsync({
        eventId,
        alias,
        consentGiven: parsed.data.consentGiven,
        media: {
          storageKey: uploadedMedia.storageKey,
          mimeType: uploadedMedia.mimeType,
          sizeBytes: uploadedMedia.sizeBytes,
          width: uploadedMedia.width,
          height: uploadedMedia.height,
          url: uploadedMedia.url,
        },
      });

      setUploadState("uploaded");
      toast.success("Upload submitted successfully. Pending moderation.");
    } catch (error) {
      setUploadState("failed");
      toast.error(error instanceof Error ? error.message : "Failed to submit upload.");
    }
  };

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-8">
        <PageHeader
          eyebrow="Community"
          title="Share Your Moment"
          description="Submit your event photos and stories. Approved uploads become part of the public archive."
        />

        {uploadState === "uploaded" && (
          <ConfirmationBanner
            title="Upload submitted successfully"
            message="Your upload is pending moderation and will appear when approved."
            tone="approved"
          />
        )}

        {uploadState === "failed" && (
          <ConfirmationBanner
            title="Upload rejected"
            message="Missing required fields. Add alias, event, and an image before submitting."
            tone="failed"
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 md:gap-8">
          <div className="border border-border bg-card p-5 md:p-6">
            <h2 className="font-display text-xl text-foreground mb-4">Upload Zone</h2>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border hover:border-accent transition-colors p-8 text-center">
                <Upload size={30} className="mx-auto mb-3 text-foreground-secondary" />
                <p className="font-display text-sm text-foreground mb-1">Drop your image here</p>
                <p className="text-xs text-foreground-secondary">JPG, PNG, or WEBP up to 10MB</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    if (!selected) return;

                    const validation = validateFile(selected, "community");
                    if (!validation.valid) {
                      setUploadState("failed");
                      toast.error(validation.error ?? "Invalid image file.");
                      return;
                    }

                    revokePreviewUrl(preview);
                    setFile(selected);
                    setPreview(createPreviewUrl(selected));
                    setUploadState("idle");
                  }}
                  className={`mt-4 ${formFileInputClassName}`}
                />
                {file && <p className={formHelperTextClassName}>Selected: {file.name}</p>}
              </div>

              <div>
                <label className={formLabelClassName}>Alias *</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary"><User size={16} /></span>
                  <input
                    value={alias}
                    onChange={(event) => setAlias(event.target.value)}
                    placeholder="How should we credit you?"
                    className={`${formInputClassName} pl-10`}
                    required
                  />
                </div>
                <p className={formHelperTextClassName}>This name appears if your upload is approved.</p>
              </div>

              <div>
                <label className={formLabelClassName}>Event *</label>
                <select
                  value={eventId}
                  onChange={(event) => setEventId(event.target.value)}
                  className={formSelectClassName}
                  required
                >
                  <option value="">Select an event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>

              <p className={formHelperTextClassName}>
                Upload policy notice: offensive, unrelated, or copyrighted content may be rejected.
              </p>

              <label className="flex items-start gap-3 text-sm text-foreground-secondary">
                <input type="checkbox" checked={consentGiven} onChange={(event) => setConsentGiven(event.target.checked)} className="mt-1" />
                <span>I consent to this image being reviewed and, if approved, displayed in the public community archive.</span>
              </label>

              <Button variant="accent" size="lg" className="w-full" onClick={submitUpload} disabled={!consentGiven || uploadState === "uploading"}>
                {uploadState === "uploading" || submitUploadMutation.isPending || uploadMediaMutation.isPending ? "Uploading..." : "Submit Your Moment"}
              </Button>
            </div>
          </div>

          <aside className="border border-border bg-secondary/20 p-4 md:p-5 rounded-md">
            <h3 className="font-display text-sm text-foreground mb-3">Image Preview</h3>
            {preview ? (
              <img src={preview} alt="Selected upload" className="w-full aspect-[4/5] object-cover mb-3" />
            ) : (
              <div className="border border-border bg-background p-8 text-center text-xs text-foreground-secondary mb-3">
                Preview will appear here
              </div>
            )}
            <p className="text-xs text-foreground-secondary">Status: {uploadState}</p>
          </aside>
        </div>

        <div>
          <h2 className="font-display text-2xl text-foreground mb-4">Approved Community Uploads</h2>
          {isApprovedUploadsLoading && <p className="text-sm text-foreground-secondary mb-3">Loading approved uploads...</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {approvedUploads.map((upload) => {
              const event = events.find((item) => item.id === upload.eventId);
              return <UploadCard key={upload.id} upload={upload} eventTitle={event?.title ?? "Event"} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
