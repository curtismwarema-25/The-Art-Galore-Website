import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Handshake, Share2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import OrderSummaryCard from "@/components/tickets/OrderSummaryCard";
import TicketTierSelector from "@/components/tickets/TicketTierSelector";
import { ApiError } from "@/api/client";
import { communityUploadFormSchema, ticketPurchaseFormSchema } from "@/features/forms/schemas";
import { createPreviewUrl, revokePreviewUrl, validateFile } from "@/features/uploads/uploadService";
import { useCreateOrderMutation } from "@/hooks/mutations/useCreateOrderMutation";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import { useSubmitCommunityUploadMutation } from "@/hooks/mutations/useUploadMutations";
import { useEventQuery } from "@/hooks/queries/useEventQuery";
import { toast } from "@/components/ui/sonner";
import {
  formFileInputClassName,
  formHelperTextClassName,
  formInputClassName,
  formLabelClassName,
} from "@/lib/formStyles";

export default function EventDetail() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading, isError } = useEventQuery(slug);
  const createOrderMutation = useCreateOrderMutation();
  const submitUploadMutation = useSubmitCommunityUploadMutation();
  const uploadMediaMutation = useUploadMediaMutation();
  const orderRequestRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [alias, setAlias] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    return () => {
      revokePreviewUrl(uploadPreview);
    };
  }, [uploadPreview]);

  useEffect(() => {
    const firstAvailableTier = event?.ticketTiers?.find((tier) => tier.available > 0);
    if (!firstAvailableTier) return;

    setQuantities((current) => (
      Object.keys(current).length > 0 ? current : { [firstAvailableTier.id]: 1 }
    ));
  }, [event]);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <p className="text-sm text-foreground-secondary">Loading event details...</p>
        </div>
      </section>
    );
  }

  if (isError || !event) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <EmptyState
            title="Event Not Found"
            description="This event detail is unavailable right now."
            action={<Link to="/events" className="text-xs font-display tracking-[0.14em] uppercase text-accent">Back to Events</Link>}
          />
        </div>
      </section>
    );
  }

  const tiers = event.ticketTiers ?? [];
  const approvedUploads = event.approvedUploads ?? [];
  const gallery = event.galleryImages ?? [];
  const selectedTicketCount = tiers.reduce((total, tier) => total + (quantities[tier.id] ?? 0), 0);
  const selectedTotal = tiers.reduce((total, tier) => total + (quantities[tier.id] ?? 0) * tier.price, 0);
  const selectedCurrency = tiers.find((tier) => (quantities[tier.id] ?? 0) > 0)?.currency ?? "KES";
  const ticketingAvailable = event.lifecycle !== "past" && tiers.some((tier) => tier.available > 0);

  const scrollToTicketPurchase = () => {
    document.getElementById("ticket-purchase")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const increaseTier = (tierId: string) => setQuantities((current) => ({ ...current, [tierId]: (current[tierId] ?? 0) + 1 }));
  const decreaseTier = (tierId: string) => setQuantities((current) => ({ ...current, [tierId]: Math.max((current[tierId] ?? 0) - 1, 0) }));

  const initiatePayment = async () => {
    const parsed = ticketPurchaseFormSchema.safeParse({
      eventId: event.id,
      buyerName: fullName,
      buyerPhone: phone,
      buyerEmail: email,
      quantities,
    });

    if (!parsed.success) {
      toast.error("Select ticket quantity and enter valid buyer details.");
      return;
    }

    const selectedItems = tiers
      .map((tier) => ({
        ticketTierId: tier.id,
        quantity: quantities[tier.id] ?? 0,
      }))
      .filter((item) => item.quantity > 0);

    if (selectedItems.length === 0) {
      toast.error("Select at least one ticket tier.");
      return;
    }

    try {
      const buyer = {
        buyerName: parsed.data.buyerName.trim(),
        buyerPhone: parsed.data.buyerPhone.trim(),
        buyerEmail: parsed.data.buyerEmail.trim(),
      };
      const fingerprint = JSON.stringify({ eventId: event.id, buyer, items: selectedItems });
      if (orderRequestRef.current?.fingerprint !== fingerprint) {
        orderRequestRef.current = {
          fingerprint,
          key: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        };
      }

      const result = await createOrderMutation.mutateAsync({
        input: {
          eventId: event.id,
          buyer,
          items: selectedItems,
        },
        idempotencyKey: orderRequestRef.current.key,
      });
      orderRequestRef.current = null;

      if (result.idempotentReplay) {
        toast.success(`Loaded existing order ${result.order.orderNumber}. Redirecting to tracking page.`);
      } else {
        toast.success(`Order ${result.order.orderNumber} created. Redirecting to payment tracking.`);
      }

      const phoneForStk = parsed.data.buyerPhone.trim();
      navigate(`/orders/track/${result.order.publicToken}?autostk=1&phone=${encodeURIComponent(phoneForStk)}`);
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : "Could not create order.";
      toast.error(message);
    }
  };

  const handleUploadFile = (eventInput: ChangeEvent<HTMLInputElement>) => {
    const file = eventInput.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "community");
    if (!validation.valid) {
      setUploadMessage(validation.error ?? "Invalid file.");
      return;
    }

    revokePreviewUrl(uploadPreview);
    setUploadFile(file);
    setUploadPreview(createPreviewUrl(file));
    setUploadMessage("");
  };

  const submitCommunityUpload = async () => {
    if (!uploadFile) {
      setUploadMessage("Add an image before submitting.");
      return;
    }

    const parsed = communityUploadFormSchema.safeParse({
      alias,
      eventId: event.id,
      file: uploadFile,
    });

    if (!parsed.success) {
      setUploadMessage("Add an alias and image before submitting.");
      return;
    }

    try {
      const uploadedMedia = await uploadMediaMutation.mutateAsync({
        file: uploadFile,
        target: "community",
      });

      await submitUploadMutation.mutateAsync({
        eventId: event.id,
        alias: parsed.data.alias.trim(),
        consentGiven: true,
        media: {
          storageKey: uploadedMedia.storageKey,
          mimeType: uploadedMedia.mimeType,
          sizeBytes: uploadedMedia.sizeBytes,
          width: uploadedMedia.width,
          height: uploadedMedia.height,
          url: uploadedMedia.url,
        },
      });

      setUploadMessage("Upload submitted successfully. Pending moderation.");
      toast.success("Upload submitted successfully. Pending moderation.");
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  const supportedByText = event.supportedBy.length > 0 ? event.supportedBy.join(" and ") : "Community Partners";

  return (
    <>
      <section className="relative h-[42vh] min-h-[300px] overflow-hidden md:h-[56vh] md:min-h-[380px]">
        <img src={event.heroImage} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 lg:p-14">
          <div className="container-narrow">
            <Link to="/events" className="inline-flex items-center gap-2 text-accent font-display text-xs tracking-widest uppercase mb-4 hover:opacity-80 transition-opacity">
              <ArrowLeft size={14} /> Back to Events
            </Link>
            <PageHeader eyebrow={event.type} title={event.title} description={event.summary} />
            <p className="inline-flex items-center gap-2 text-xs md:text-sm font-display uppercase tracking-wider text-background/90">
              <Handshake size={14} className="text-accent" />
              Supported By {supportedByText}
            </p>
            {ticketingAvailable && (
              <Button type="button" variant="accent" size="lg" className="mt-5" onClick={scrollToTicketPurchase}>
                Get Your Ticket
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className={`section-padding ${ticketingAvailable ? "pb-28 md:pb-24" : ""}`}>
        <div className="container-narrow grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 md:gap-12">
          <div className="space-y-8">
            <div className="border border-border bg-card p-5 md:p-6">
              <h2 className="font-display text-2xl text-foreground mb-4">Event Details</h2>
              <p className="text-sm text-foreground-secondary mb-4">{event.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground-secondary">
                <p><span className="text-foreground">Date:</span> {event.date}</p>
                <p><span className="text-foreground">Time:</span> {event.time}</p>
                <p><span className="text-foreground">Venue:</span> {event.venue}</p>
                {event.capacity > 0 && <p><span className="text-foreground">Capacity:</span> {event.capacity} guests</p>}
              </div>
            </div>

            <div className="border border-border bg-card p-5 md:p-6">
              <h3 className="font-display text-xl text-foreground mb-3">Share & Invite</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={() => toast.success("Share flow placeholder ready for backend deep links.")}>
                  <Share2 size={14} /> Share Event
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Bring-a-friend referral placeholder triggered.")}>
                  <UserPlus size={14} /> Bring a Friend
                </Button>
              </div>
            </div>

            {event.highlights.length > 0 && <div className="border border-border bg-card p-5 md:p-6">
              <h3 className="font-display text-xl text-foreground mb-3">Event Highlights</h3>
              <ul className="space-y-2">
                {event.highlights.map((item) => (
                  <li key={item} className="text-sm text-foreground-secondary">- {item}</li>
                ))}
              </ul>
            </div>}

            <div className="border border-border bg-card p-5 md:p-6">
              <h3 className="font-display text-xl text-foreground mb-4">Community Upload</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className={formLabelClassName}>Alias</label>
                  <input
                    value={alias}
                    onChange={(eventInput) => setAlias(eventInput.target.value)}
                    placeholder="How should we credit you?"
                    className={formInputClassName}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFile}
                    className={formFileInputClassName}
                  />
                  <p className={formHelperTextClassName}>
                    Upload policy notice: only event-relevant content will be approved for the public archive.
                  </p>
                  <Button variant="accent" size="sm" onClick={submitCommunityUpload} disabled={submitUploadMutation.isPending}>
                    {submitUploadMutation.isPending || uploadMediaMutation.isPending ? "Submitting..." : "Submit Upload"}
                  </Button>
                  {uploadMessage && <p className="text-xs text-accent">{uploadMessage}</p>}
                </div>
                <div className="border border-border bg-secondary/20 p-3 rounded-md">
                  {uploadPreview ? (
                    <img src={uploadPreview} alt="Upload preview" className="w-full aspect-[4/5] object-cover" />
                  ) : (
                    <p className="text-xs text-foreground-secondary">Image preview appears here.</p>
                  )}
                </div>
              </div>

              {approvedUploads.length > 0 && (
                <div className="mt-5">
                  <h4 className="font-display text-sm text-foreground mb-3">Approved Uploads Preview</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {approvedUploads.map((upload) => (
                      <article key={upload.id} className="border border-border bg-background p-2">
                        <img src={upload.image} alt={upload.alias} className="w-full aspect-[4/5] object-cover mb-2" />
                        <p className="text-xs text-foreground-secondary">{upload.alias}</p>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {event.lifecycle === "past" && (
              <div className="space-y-6">
                <div className="border border-border bg-card p-5 md:p-6">
                  <h3 className="font-display text-xl text-foreground mb-4">Post-Event Archive</h3>
                  <p className="text-sm text-foreground-secondary">
                    This archive section is prepared for backend media, highlights, uploads, and partner history.
                  </p>
                </div>

                <div className="border border-border bg-card p-5 md:p-6">
                  <h4 className="font-display text-lg text-foreground mb-3">Gallery</h4>
                  {gallery.length === 0 ? (
                    <p className="text-sm text-foreground-secondary">No gallery images are available for this event yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {gallery.map((image) => (
                        <img key={image.id} src={image.image} alt={image.caption} className="w-full aspect-[4/5] object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="order-first space-y-4 self-start lg:order-last lg:sticky lg:top-20">
            <div id="ticket-purchase" className="scroll-mt-24 border border-accent/35 bg-card p-5 md:p-6 shadow-sm">
              <div className="mb-4">
                <p className="font-display text-xs uppercase tracking-[0.2em] text-accent">Reserve your place</p>
                <h3 className="mt-2 font-display text-2xl text-foreground">Get Your Ticket</h3>
                <p className="mt-1 text-sm text-foreground-secondary">Choose your ticket, enter your details, and pay securely with M-Pesa.</p>
              </div>
              {tiers.length === 0 ? (
                <p className="text-xs text-foreground-secondary mb-4">
                  Ticket tiers are not available for this event yet. Check back soon or contact support.
                </p>
              ) : (
                <TicketTierSelector tiers={tiers} quantities={quantities} onIncrease={increaseTier} onDecrease={decreaseTier} />
              )}

              <div className="mt-4">
                <label className={formLabelClassName}>
                  Full Name *
                </label>
                <input
                  value={fullName}
                  onChange={(eventInput) => setFullName(eventInput.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className={formInputClassName}
                  required
                />
              </div>

              <div className="mt-3">
                <label className={formLabelClassName}>
                  M-Pesa Phone Number *
                </label>
                <input
                  value={phone}
                  onChange={(eventInput) => setPhone(eventInput.target.value)}
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className={formInputClassName}
                  required
                />
              </div>

              <div className="mt-3">
                <label className={formLabelClassName}>
                  Email for Tickets *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(eventInput) => setEmail(eventInput.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={formInputClassName}
                  required
                />
              </div>

              <div className="mt-4">
                <OrderSummaryCard tiers={tiers} quantities={quantities} phoneNumber={phone} />
              </div>

              <Button
                variant="accent"
                size="lg"
                className="w-full mt-4"
                onClick={() => void initiatePayment()}
                disabled={createOrderMutation.isPending || selectedTicketCount === 0}
              >
                {createOrderMutation.isPending
                  ? "Creating Order..."
                  : `Pay ${selectedCurrency} ${selectedTotal.toLocaleString()} with M-Pesa`}
              </Button>
              <p className="mt-3 text-center text-[11px] text-foreground-secondary">
                No account required · Your ticket is delivered after payment
              </p>
            </div>

            <div className="border border-border bg-secondary/15 p-4">
              <h4 className="font-display text-sm text-foreground mb-2">Partner Support</h4>
              <p className="text-xs text-foreground-secondary">In Collaboration With {event.supportedBy.join(", ") || "Community Partners"}</p>
              <StatusBadge tone={event.lifecycle === "past" ? "approved" : "published"} label={event.lifecycle} />
            </div>
          </aside>
        </div>
      </section>

      {ticketingAvailable && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(20,23,56,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-display uppercase tracking-[0.12em] text-foreground-secondary">Your ticket</p>
              <p className="font-display text-base text-foreground">{selectedCurrency} {selectedTotal.toLocaleString()}</p>
            </div>
            <Button type="button" variant="accent" onClick={scrollToTicketPurchase}>
              Get Ticket
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
