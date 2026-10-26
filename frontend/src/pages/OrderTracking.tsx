import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Clock3, LoaderCircle, ReceiptText, Smartphone, Upload } from "lucide-react";
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

function createStkIdempotencyKey() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `stk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const PAYMENT_BLOCKING_OVERLAY_MS = 10_000;

export default function OrderTracking() {
  const { publicToken = "" } = useParams();
  const [searchParams] = useSearchParams();
  const [stkRequested, setStkRequested] = useState(false);
  const [pollPaymentStatus, setPollPaymentStatus] = useState(false);
  const [paymentWaitStartedAt, setPaymentWaitStartedAt] = useState<number | null>(null);
  const [paymentWaitClock, setPaymentWaitClock] = useState(() => Date.now());
  const autoStkAttempted = useRef(false);
  const { data: order, isLoading, isError, refetch: refetchOrder } = useTrackOrderQuery(publicToken, stkRequested || pollPaymentStatus ? 5_000 : 30_000);
  const { data: settings } = usePublicSiteSettingsQuery();
  const uploadMediaMutation = useUploadMediaMutation();
  const submitProofMutation = useSubmitManualPaymentProofMutation(publicToken);
  const initiateStkMutation = useInitiateMpesaStkPushMutation(publicToken);
  const orderCanStillBeWaitingForStk = order?.status === "pending_payment" || order?.status === "payment_submitted";
  const awaitingTicketIssue = order?.paymentStatus === "paid" && order.tickets.length === 0;
  const paymentProcessing = initiateStkMutation.isPending
    || Boolean(order?.mpesaPaymentPending)
    || (stkRequested && Boolean(orderCanStillBeWaitingForStk))
    || Boolean(awaitingTicketIssue);
  const showBlockingPaymentScreen = paymentProcessing
    && paymentWaitStartedAt !== null
    && paymentWaitClock - paymentWaitStartedAt < PAYMENT_BLOCKING_OVERLAY_MS;

  useEffect(() => {
    if (!paymentProcessing) {
      setPaymentWaitStartedAt(null);
      return;
    }

    setPaymentWaitStartedAt((startedAt) => startedAt ?? Date.now());
    const timer = window.setInterval(() => setPaymentWaitClock(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [paymentProcessing]);

  const [paymentMethod, setPaymentMethod] = useState<"bank" | "mpesa" | "manual">("mpesa");
  const [payerName, setPayerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");

  useEffect(() => {
    if (!order) return;
    setAmountPaid(order.amountDue.toString());
    if (!phoneNumber.trim()) {
      const candidate = searchParams.get("phone")?.trim();
      if (candidate) setPhoneNumber(candidate);
    }
  }, [order, phoneNumber, searchParams]);

  useEffect(() => {
    if (!order) return;
    const awaitingMpesaVerification = order.status === "payment_submitted"
      && order.paymentStatus === "pending"
      && order.verificationStatus === "not_submitted";
    const awaitingTicketFulfillment = order.paymentStatus === "paid"
      && (order.tickets.length === 0 || (order.ticketEmailDeliveryEnabled && order.ticketDeliveryStatus === "pending"));
    setPollPaymentStatus(order.mpesaPaymentPending || awaitingMpesaVerification || awaitingTicketFulfillment);

    if (stkRequested && (order.status === "paid" || order.status === "expired" || order.status === "payment_rejected")) {
      setStkRequested(false);
    }
  }, [order, stkRequested]);

  useEffect(() => {
    return () => {
      revokePreviewUrl(screenshotPreview);
    };
  }, [screenshotPreview]);

  useEffect(() => {
    if (!order || stkRequested || autoStkAttempted.current || !order.canSubmitPaymentProof) return;
    if (searchParams.get("autostk") !== "1") return;

    const phone = searchParams.get("phone")?.trim() || "";
    if (!phone) return;

    autoStkAttempted.current = true;
    setStkRequested(true);
    initiateStkMutation
      .mutateAsync({
        input: { phoneNumber: phone },
        idempotencyKey: createStkIdempotencyKey(),
      })
      .then((result) => {
        toast.success(result.customerMessage || "M-Pesa prompt sent.");
      })
      .catch((error) => {
        void refetchOrder().then((refreshed) => {
          if (!refreshed.data?.mpesaPaymentPending) setStkRequested(false);
        });
        toast.error(error instanceof Error ? error.message : "Could not send STK push.");
      });
  }, [order, searchParams, stkRequested, initiateStkMutation, refetchOrder]);

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

    if (order.mpesaPaymentPending || stkRequested || initiateStkMutation.isPending) {
      toast.error("An M-Pesa payment is already processing for this order.");
      return;
    }

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
    if (order.mpesaPaymentPending || stkRequested || initiateStkMutation.isPending) return;
    const phone = phoneNumber.trim() || searchParams.get("phone")?.trim() || "";
    if (!phone) {
      toast.error("Enter a valid phone number for the M-Pesa prompt.");
      return;
    }

    setStkRequested(true);
    try {
      const result = await initiateStkMutation.mutateAsync({
        input: { phoneNumber: phone },
        idempotencyKey: createStkIdempotencyKey(),
      });
      toast.success(result.customerMessage || "M-Pesa prompt sent.");
    } catch (error) {
      const refreshed = await refetchOrder();
      if (!refreshed.data?.mpesaPaymentPending) setStkRequested(false);
      toast.error(error instanceof Error ? error.message : "Could not send STK push.");
    }
  };

  const formattedAmountDue = toMoney(order.currency, order.amountDue);
  const reservationExpiry = new Date(order.reservationExpiresAt).toLocaleString();
  const stkErrorMessage =
    initiateStkMutation.error instanceof Error ? initiateStkMutation.error.message : "Could not send STK push.";
  const manualPaymentEnabled = settings?.manualPaymentEnabled ?? true;
  const hasIssuedTickets = order.tickets.length > 0;
  const canStartPayment = order.canSubmitPaymentProof
    && !paymentProcessing
    && !stkRequested;
  const paymentProcessingMessage = initiateStkMutation.isPending
    ? "Sending your M-Pesa payment prompt"
    : awaitingTicketIssue
      ? "Payment confirmed. We’re preparing your tickets"
      : "Check your phone and complete the M-Pesa prompt";
  const ticketDeliveryMessage =
    order.ticketDeliveryStatus === "sent"
      ? "Ticket email sent. You can also open tickets from this page."
      : order.ticketDeliveryStatus === "failed"
        ? "Ticket email needs attention. Your tickets remain available below."
        : hasIssuedTickets
          ? order.ticketEmailDeliveryEnabled
            ? "Tickets are ready below. Email delivery is still being attempted."
            : "Tickets are ready below. Email delivery is not configured on this server yet."
          : order.paymentStatus === "paid"
            ? "Payment is confirmed. We’re preparing your tickets now; this page will update automatically."
            : order.status === "payment_submitted" && order.verificationStatus === "not_submitted"
              ? "M-Pesa response received. We’re verifying the payment automatically; keep this page open while we prepare your tickets."
              : order.verificationStatus === "pending_review"
                ? "Payment proof submitted. Our team is reviewing it and will update this page."
                : order.status === "payment_rejected"
              ? "The payment was not completed. You can send another STK prompt or submit payment proof."
                  : "Payment is pending. Complete the STK prompt or submit proof if needed.";

  return (
    <>
    <section className="section-padding" aria-hidden={showBlockingPaymentScreen}>
      <div className="container-narrow space-y-6">
        <PageHeader
          eyebrow="Order Tracking"
          title={`Order ${order.orderNumber}`}
          description="Track your payment verification and access tickets from this secure link."
        />

        <article className="border border-border bg-card p-5 md:p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-sm uppercase tracking-[0.16em] text-foreground-secondary">{order.event.title}</p>
              <p className="mt-1 text-sm text-foreground-secondary">
                {new Date(order.event.startAt).toLocaleString()} at {order.event.venueName}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={orderStatusTone(order.status)} label={`order: ${order.status}`} />
              <StatusBadge tone={verificationTone(order.verificationStatus)} label={`verification: ${order.verificationStatus}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-y border-border py-4 md:grid-cols-3 md:divide-x md:divide-border">
            <div className="md:pr-4">
              <p className="text-xs font-display uppercase tracking-[0.16em] text-foreground-secondary">Amount Due</p>
              <p className="mt-1 text-lg font-display text-foreground">{formattedAmountDue}</p>
            </div>
            <div className="md:px-4">
              <p className="text-xs font-display uppercase tracking-[0.16em] text-foreground-secondary">Reservation</p>
              <p className="mt-1 text-sm text-foreground">{reservationExpiry}</p>
            </div>
            <div className="md:pl-4">
              <p className="text-xs font-display uppercase tracking-[0.16em] text-foreground-secondary">Tickets</p>
              <ul className="mt-1 space-y-1 text-sm text-foreground">
                {order.ticketQuantities.map((item) => (
                  <li key={`${item.tierName}-${item.quantity}`}>{item.tierName} x {item.quantity}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-md border border-border bg-secondary/15 p-3 text-sm text-foreground-secondary">
            <p className="text-foreground">Fulfillment Status</p>
            <p className="mt-1">{ticketDeliveryMessage}</p>
            {paymentProcessing && (
              <p className="mt-2 rounded-sm border border-accent/30 bg-background/70 p-3 text-foreground" aria-live="polite">
                {initiateStkMutation.isPending
                  ? "Sending the M-Pesa prompt. Please keep this order page open for now."
                  : awaitingTicketIssue
                    ? "Payment is confirmed; ticket creation is still in progress. You can leave and return to this link later."
                    : "We’re still checking with M-Pesa. You can leave and return to this order link later. Don’t start another payment while this one is pending."}
              </p>
            )}
            {(stkRequested || pollPaymentStatus) && order.paymentStatus === "pending" && (
              <p className="mt-1 text-xs">Refreshing every few seconds while the M-Pesa payment is being verified.</p>
            )}
          </div>
        </article>

        {canStartPayment && (
          <article className="border border-border bg-card p-5 md:p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/35 bg-accent/12 text-accent">
                <Smartphone size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg text-foreground">M-Pesa STK Checkout</h2>
                <p className="text-sm text-foreground-secondary">
                  Pay {formattedAmountDue} for order {order.orderNumber}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <label className="block">
                <span className={formLabelClassName}>M-Pesa Phone Number *</span>
                <input
                  value={phoneNumber}
                  onChange={(eventInput) => setPhoneNumber(eventInput.target.value)}
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  className={formInputClassName}
                />
              </label>
              <Button type="button" variant="accent" onClick={() => void triggerStkPush()} disabled={initiateStkMutation.isPending}>
                <Smartphone size={16} />
                {initiateStkMutation.isPending ? "Sending Prompt..." : "Send STK Prompt"}
              </Button>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/15 p-3 text-sm text-foreground-secondary">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-accent" />
              <div>
                {initiateStkMutation.isPending && <p>Sending a payment prompt to your phone.</p>}
                {initiateStkMutation.isSuccess && <p className="text-foreground">M-Pesa prompt sent. Complete it on your phone.</p>}
                {initiateStkMutation.isError && <p>{stkErrorMessage}</p>}
                {!initiateStkMutation.isPending && !initiateStkMutation.isSuccess && !initiateStkMutation.isError && (
                  <p>Complete the M-Pesa prompt before {reservationExpiry}.</p>
                )}
              </div>
            </div>
          </article>
        )}

        {canStartPayment && manualPaymentEnabled && (
          <article className="border border-border bg-card p-5 md:p-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground-secondary">
                <ReceiptText size={18} />
              </span>
              <div>
                <h2 className="font-display text-lg text-foreground">Payment Proof Fallback</h2>
                <p className="text-sm text-foreground-secondary">
                  Submit a receipt or bank reference if the STK prompt is unavailable.
                </p>
              </div>
            </div>

            {(settings?.mpesaPaybill ||
              settings?.mpesaAccountInstructions ||
              settings?.bankName ||
              settings?.bankAccountName ||
              settings?.bankAccountNumber ||
              settings?.supportContactText) && (
              <div className="grid grid-cols-1 gap-3 border-y border-border py-4 text-sm text-foreground-secondary md:grid-cols-2">
                {settings?.mpesaPaybill && (
                  <p>
                    M-Pesa Paybill: <span className="text-foreground">{settings.mpesaPaybill}</span>
                  </p>
                )}
                {settings?.mpesaAccountInstructions && <p>{settings.mpesaAccountInstructions}</p>}
                {settings?.bankName && (
                  <p>
                    Bank: <span className="text-foreground">{settings.bankName}</span>
                    {settings.bankBranch ? ` (${settings.bankBranch})` : ""}
                  </p>
                )}
                {settings?.bankAccountName && (
                  <p>
                    Account Name: <span className="text-foreground">{settings.bankAccountName}</span>
                  </p>
                )}
                {settings?.bankAccountNumber && (
                  <p>
                    Account Number: <span className="text-foreground">{settings.bankAccountNumber}</span>
                  </p>
                )}
                {settings?.supportContactText && <p>{settings.supportContactText}</p>}
              </div>
            )}

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

        {!order.canSubmitPaymentProof && order.status !== "payment_submitted" && (
          <article className="border border-border bg-card p-5 md:p-6">
            <p className="text-sm text-foreground-secondary">
              Payment actions are currently unavailable for this order status.
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
    {showBlockingPaymentScreen && (
      <div className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-background px-6 text-center" role="status" aria-live="polite">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <LoaderCircle className="h-12 w-12 animate-spin text-accent" aria-hidden="true" />
          <p className="mt-6 font-display text-xs uppercase tracking-[0.24em] text-accent">Payment in progress</p>
          <h1 className="mt-3 font-display text-2xl text-foreground">{paymentProcessingMessage}</h1>
          <p className="mt-3 text-sm leading-6 text-foreground-secondary">
            We’re checking the payment with M-Pesa. Keep this page open and don’t start another payment. This screen will update when payment is confirmed or declined.
          </p>
          <p className="mt-5 text-xs text-foreground-secondary">Order {order.orderNumber}</p>
        </div>
      </div>
    )}
    </>
  );
}

