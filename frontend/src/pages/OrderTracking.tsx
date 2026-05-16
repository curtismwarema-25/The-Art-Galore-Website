import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Upload } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import StatusBadge from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useInitiateMpesaStkPushMutation, useSubmitManualPaymentProofMutation } from "@/hooks/mutations/usePaymentMutations";
import { useUploadMediaMutation } from "@/hooks/mutations/useUploadMediaMutation";
import { usePublicSiteSettingsQuery } from "@/hooks/queries/usePublicSiteSettingsQuery";
import { useTrackOrderQuery } from "@/hooks/queries/useTrackOrderQuery";
import { createPreviewUrl, revokePreviewUrl, validateFile } from "@/features/uploads/uploadService";
import { toast } from "@/components/ui/sonner";
import {
  formFileInputClassName,
  formHelperTextClassName,
  formInputClassName,
  formLabelClassName,
  formSelectClassName,
  formTextareaClassName,
} from "@/lib/formStyles";

function toMoney(currency: string, value: number) {
  return `${currency} ${value.toLocaleString()}`;
}

function orderStatusTone(status: string) {
  if (status === "paid") return "paid";
  if (status === "payment_rejected" || status === "expired") return "rejected";
  return "pending";
}

function verificationTone(status: string) {
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  if (status === "pending_review") return "pending";
  return "draft";
}

export default function OrderTracking() {
  const { publicToken = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { data: order, isLoading, isError } = useTrackOrderQuery(publicToken);
  const { data: settings } = usePublicSiteSettingsQuery();
  const uploadMediaMutation = useUploadMediaMutation();
  const submitProofMutation = useSubmitManualPaymentProofMutation(publicToken);
  const initiateStkMutation = useInitiateMpesaStkPushMutation(publicToken);

  const [paymentMethod, setPaymentMethod] = useState<"bank" | "mpesa" | "manual">("mpesa");
  const [payerName, setPayerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [stkRequested, setStkRequested] = useState(false);

  useEffect(() => {
    if (!order) return;
    setAmountPaid(order.amountDue.toString());
    if (!phoneNumber.trim()) {
      const candidate = searchParams.get("phone")?.trim();
      if (candidate) setPhoneNumber(candidate);
    }
  }, [order, phoneNumber, searchParams]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(screenshotPreview);
    };
  }, [screenshotPreview]);

  useEffect(() => {
    if (!order || stkRequested || !order.canSubmitPaymentProof) return;
    if (searchParams.get("autostk") !== "1") return;

    const phone = searchParams.get("phone")?.trim() || "";
    if (!phone) return;

    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `stk-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setStkRequested(true);
    initiateStkMutation
      .mutateAsync({
        input: { phoneNumber: phone },
        idempotencyKey,
      })
      .then((result) => {
        toast.success(result.customerMessage || "M-Pesa prompt sent.");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Could not send STK push.");
      });
  }, [order, searchParams, stkRequested, initiateStkMutation]);

  if (isLoading) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <p className="text-sm text-foreground-secondary">Loading order tracking details...</p>
        </div>
      </section>
    );
  }

  if (isError || !order) {
    return (
      <section className="section-padding">
        <div className="container-narrow">
          <EmptyState
            title="Order Not Found"
            description="This order tracking link is invalid or has expired."
            action={<Link to="/events" className="text-xs font-display tracking-[0.14em] uppercase text-accent">Back to Events</Link>}
          />
        </div>
      </section>
    );
  }

  const onScreenshotSelected = (eventInput: ChangeEvent<HTMLInputElement>) => {
    const file = eventInput.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file, "payment-proof");
    if (!validation.valid) {
      toast.error(validation.error ?? "Invalid screenshot file.");
      return;
    }

    revokePreviewUrl(screenshotPreview);
    setScreenshotFile(file);
    setScreenshotPreview(createPreviewUrl(file));
  };

  const submitPaymentProof = async (eventInput: FormEvent<HTMLFormElement>) => {
    eventInput.preventDefault();

    if (!order.canSubmitPaymentProof) {
      toast.error("This order is not accepting payment proof submissions.");
      return;
    }

    const parsedAmount = Number(amountPaid);
    if (!payerName.trim() || !phoneNumber.trim() || !transactionReference.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Complete all required payment proof fields.");
      return;
    }

    try {
      const uploadedScreenshot = screenshotFile
        ? await uploadMediaMutation.mutateAsync({
            file: screenshotFile,
            target: "payment-proof",
          })
        : undefined;

      await submitProofMutation.mutateAsync({
        paymentMethod,
        payerName: payerName.trim(),
        phoneNumber: phoneNumber.trim(),
        amountPaid: parsedAmount,
        transactionReference: transactionReference.trim(),
        screenshot: uploadedScreenshot
          ? {
              url: uploadedScreenshot.url,
              storageKey: uploadedScreenshot.storageKey,
              mimeType: uploadedScreenshot.mimeType as "image/jpeg" | "image/png" | "image/webp",
              sizeBytes: uploadedScreenshot.sizeBytes,
            }
          : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success("Payment proof submitted for admin verification.");
      setTransactionReference("");
      setNotes("");
      setScreenshotFile(null);
      revokePreviewUrl(screenshotPreview);
      setScreenshotPreview("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit payment proof.");
    }
  };

  const triggerStkPush = async () => {
    const phone = phoneNumber.trim() || searchParams.get("phone")?.trim() || "";
    if (!phone) {
      toast.error("Enter a valid phone number in the proof form first.");
      return;
    }

    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `stk-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      const result = await initiateStkMutation.mutateAsync({
        input: { phoneNumber: phone },
        idempotencyKey,
      });
      toast.success(result.customerMessage || "M-Pesa prompt sent.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send STK push.");
    }
  };

  return (
    <section className="section-padding">
      <div className="container-narrow space-y-6">
        <PageHeader
          eyebrow="Order Tracking"
          title={`Order ${order.orderNumber}`}
          description="Track your payment verification and access tickets from this secure link."
        />

        <article className="border border-border bg-card p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={orderStatusTone(order.status)} label={`order: ${order.status}`} />
            <StatusBadge tone={verificationTone(order.verificationStatus)} label={`verification: ${order.verificationStatus}`} />
          </div>
          <p className="text-sm text-foreground-secondary">
            Amount Due: <span className="text-foreground">{toMoney(order.currency, order.amountDue)}</span>
          </p>
          <p className="text-sm text-foreground-secondary">
            Reservation Expires: <span className="text-foreground">{new Date(order.reservationExpiresAt).toLocaleString()}</span>
          </p>

          <div className="text-sm text-foreground-secondary">
            <p className="text-foreground mb-2">Tickets</p>
            <ul className="space-y-1">
              {order.ticketQuantities.map((item) => (
                <li key={`${item.tierName}-${item.quantity}`}>{item.tierName} x {item.quantity}</li>
              ))}
            </ul>
          </div>
        </article>

        <article className="border border-border bg-card p-5 md:p-6 space-y-3">
          <h2 className="font-display text-lg text-foreground">Payment Instructions</h2>
          <p className="text-sm text-foreground-secondary">{settings?.mpesaComingSoonMessage ?? "Automated M-Pesa checkout coming soon"}</p>
          {settings?.mpesaPaybill && (
            <p className="text-sm text-foreground-secondary">
              M-Pesa Paybill: <span className="text-foreground">{settings.mpesaPaybill}</span>
            </p>
          )}
          {settings?.mpesaAccountInstructions && <p className="text-sm text-foreground-secondary">{settings.mpesaAccountInstructions}</p>}
          {settings?.bankName && (
            <p className="text-sm text-foreground-secondary">
              Bank: <span className="text-foreground">{settings.bankName}</span>
              {settings.bankBranch ? ` (${settings.bankBranch})` : ""}
            </p>
          )}
          {settings?.bankAccountName && (
            <p className="text-sm text-foreground-secondary">
              Account Name: <span className="text-foreground">{settings.bankAccountName}</span>
            </p>
          )}
          {settings?.bankAccountNumber && (
            <p className="text-sm text-foreground-secondary">
              Account Number: <span className="text-foreground">{settings.bankAccountNumber}</span>
            </p>
          )}
          {settings?.supportContactText && <p className="text-sm text-foreground-secondary">{settings.supportContactText}</p>}
          {order.canSubmitPaymentProof && (
            <div className="pt-2">
              <Button type="button" variant="accent" onClick={() => void triggerStkPush()} disabled={initiateStkMutation.isPending}>
                {initiateStkMutation.isPending ? "Sending STK Prompt..." : "Pay via M-Pesa STK Push"}
              </Button>
            </div>
          )}
        </article>

        {order.canSubmitPaymentProof && (settings?.manualPaymentEnabled ?? true) && (
          <article className="border border-border bg-card p-5 md:p-6">
            <h2 className="font-display text-lg text-foreground mb-4">Submit Payment Proof</h2>
            <form className="space-y-3" onSubmit={submitPaymentProof}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="block">
                  <span className={formLabelClassName}>Payment Method *</span>
                  <select
                    value={paymentMethod}
                    onChange={(eventInput) => setPaymentMethod(eventInput.target.value as "bank" | "mpesa" | "manual")}
                    className={formSelectClassName}
                    required
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
                <label className="block">
                  <span className={formLabelClassName}>Payer Name *</span>
                  <input
                    value={payerName}
                    onChange={(eventInput) => setPayerName(eventInput.target.value)}
                    placeholder="Full name used for payment"
                    className={formInputClassName}
                    required
                  />
                </label>
                <label className="block">
                  <span className={formLabelClassName}>Phone Number *</span>
                  <input
                    value={phoneNumber}
                    onChange={(eventInput) => setPhoneNumber(eventInput.target.value)}
                    placeholder="07XXXXXXXX"
                    className={formInputClassName}
                    required
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className={formLabelClassName}>Amount Paid *</span>
                  <input
                    value={amountPaid}
                    onChange={(eventInput) => setAmountPaid(eventInput.target.value)}
                    placeholder="e.g. 2500"
                    className={formInputClassName}
                    required
                  />
                </label>
                <label className="block">
                  <span className={formLabelClassName}>Transaction Reference *</span>
                  <input
                    value={transactionReference}
                    onChange={(eventInput) => setTransactionReference(eventInput.target.value)}
                    placeholder="M-Pesa or bank reference"
                    className={formInputClassName}
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className={formLabelClassName}>Notes (Optional)</span>
                <textarea
                  value={notes}
                  onChange={(eventInput) => setNotes(eventInput.target.value)}
                  placeholder="Any extra context for the verification team"
                  className={formTextareaClassName}
                />
              </label>
              <div className="border border-dashed border-border rounded-md p-3 bg-secondary/15">
                <label className={formLabelClassName}>
                  <span className="inline-flex items-center gap-2">
                    <Upload size={14} />
                    Optional screenshot upload
                  </span>
                </label>
                <input type="file" accept="image/jpeg,image/png,image/webp" className={formFileInputClassName} onChange={onScreenshotSelected} />
                <p className={formHelperTextClassName}>Accepted formats: JPG, PNG, WEBP.</p>
                {screenshotFile && <p className={formHelperTextClassName}>Selected: {screenshotFile.name}</p>}
                {screenshotPreview && (
                  <img src={screenshotPreview} alt="Payment proof preview" className="mt-3 w-full max-w-sm rounded-md border border-border" />
                )}
              </div>
              <Button type="submit" variant="accent" disabled={submitProofMutation.isPending || uploadMediaMutation.isPending}>
                {submitProofMutation.isPending || uploadMediaMutation.isPending ? "Submitting..." : "Submit Payment Proof"}
              </Button>
            </form>
          </article>
        )}

        {!order.canSubmitPaymentProof && (
          <article className="border border-border bg-card p-5 md:p-6">
            <p className="text-sm text-foreground-secondary">
              Payment proof submission is currently unavailable for this order status.
            </p>
          </article>
        )}

        {order.tickets.length > 0 && (
          <article className="border border-border bg-card p-5 md:p-6 space-y-3">
            <h2 className="font-display text-lg text-foreground">Issued Tickets</h2>
            <div className="space-y-2">
              {order.tickets.map((ticket) => (
                <div key={ticket.publicTicketToken} className="flex items-center justify-between gap-3 border border-border rounded-md p-3">
                  <div>
                    <p className="text-sm text-foreground">{ticket.ticketNumber}</p>
                    <p className="text-xs text-foreground-secondary">Issued {new Date(ticket.issuedAt).toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/tickets/${ticket.publicTicketToken}`}>Open Ticket</Link>
                  </Button>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
    </section>
  );
}

