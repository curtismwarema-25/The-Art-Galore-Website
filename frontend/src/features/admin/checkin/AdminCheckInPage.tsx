import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BrowserCodeReader, BrowserQRCodeReader } from "@zxing/browser";
import { QrCode, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/common/EmptyState";
import SectionHeader from "@/components/common/SectionHeader";
import StatusBadge from "@/components/common/StatusBadge";
import AdminSectionCard from "@/features/admin/shared/AdminSectionCard";
import { adminInputClassName, adminLabelClassName, formatAdminStatus, formatDateTime } from "@/features/admin/shared/utils";
import { formHelperTextClassName } from "@/lib/formStyles";
import { useAdminTicketCheckInMutation } from "@/hooks/mutations/useAdminTicketCheckInMutation";
import { useAdminTicketSearchQuery } from "@/hooks/queries/useAdminTicketSearchQuery";
import { useAdminEventQuery } from "@/hooks/queries/useAdminEventsQuery";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/features/auth/useAuth";
import {
  CameraPreviewError,
  decodeCapturedVideoFrame,
  decodeQrImage,
  getCameraConstraints,
  getCameraError,
  getTicketVerificationState,
  isCameraContextSupported,
  isCaptureAvailable,
  prepareVideoPreview,
  stopMediaStream,
  type CameraState,
} from "./qrScanner";
import AdminEventWorkspaceNav from "../events/AdminEventWorkspaceNav";

type CaptureState =
  | "idle"
  | "capturing"
  | "reading"
  | "detected"
  | "verifying"
  | "success"
  | "duplicate"
  | "invalid"
  | "error";

function ticketTone(status: "active" | "checked_in" | "revoked" | "cancelled") {
  if (status === "checked_in") return "checked-in";
  if (status === "active") return "approved";
  return "rejected";
}

export default function AdminCheckInPage() {
  const { hasRole } = useAuth();
  const canCheckIn = hasRole(["admin", "staff"]);
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const { data: contextEvent } = useAdminEventQuery(eventId);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeTicketToken, setActiveTicketToken] = useState<string | null>(null);
  const [checkInMethod, setCheckInMethod] = useState<"manual" | "qr">("manual");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerState, setScannerState] = useState<CameraState>("idle");
  const [scannerMessage, setScannerMessage] = useState("");
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [captureInProgress, setCaptureInProgress] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [imageDecodeMessage, setImageDecodeMessage] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    tone: "approved" | "rejected" | "pending";
    title: string;
    message: string;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const scannerRunRef = useRef(0);
  const scannerStartingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const captureInProgressRef = useRef(false);

  const { data: matches = [], isLoading, isError, refetch } = useAdminTicketSearchQuery(
    {
      query: submittedQuery,
      eventId: eventId || undefined,
      limit: 20,
    },
    Boolean(submittedQuery),
  );
  const checkInMutation = useAdminTicketCheckInMutation();
  const scannerSupported = isCameraContextSupported();

  const activeTicket = useMemo(
    () => matches.find((ticket) => ticket.publicTicketToken === activeTicketToken) ?? matches[0] ?? null,
    [activeTicketToken, matches],
  );

  useEffect(() => {
    if (!submittedQuery || isLoading) return;

    captureInProgressRef.current = false;
    setCaptureInProgress(false);

    if (isError) {
      setCaptureState("error");
      setScannerMessage("Network or server error while verifying the ticket. Try again.");
      setVerificationResult({
        tone: "rejected",
        title: "Search failed",
        message: "Ticket details could not be loaded. Check your connection and search again.",
      });
      return;
    }

    if (matches.length === 0) {
      setCaptureState("invalid");
      setScannerMessage("No valid ticket was found. Reposition the ticket and capture again.");
      setVerificationResult({
        tone: "rejected",
        title: "Invalid ticket",
        message: "No ticket matched that token, QR payload, or search query.",
      });
      return;
    }

    const firstMatch = matches[0];
    const ticketVerificationState = getTicketVerificationState(firstMatch.ticketStatus);
    if (ticketVerificationState === "valid") {
      setCaptureState("detected");
      setScannerMessage("Valid ticket found. Review the details, then check in the guest.");
      setVerificationResult({
        tone: "approved",
        title: "Valid ticket found",
        message: `Ticket ${firstMatch.ticketNumber} is active and can be checked in.`,
      });
      return;
    }

    if (ticketVerificationState === "duplicate") {
      setCaptureState("duplicate");
      setScannerMessage("This ticket has already been checked in.");
      setVerificationResult({
        tone: "rejected",
        title: "Already checked in",
        message: `Ticket ${firstMatch.ticketNumber} has already been used.`,
      });
      return;
    }

    setCaptureState("invalid");
    setScannerMessage("The ticket is not valid for check-in.");
    setVerificationResult({
      tone: "rejected",
      title: "Ticket not valid",
      message: `Ticket ${firstMatch.ticketNumber} is ${firstMatch.ticketStatus}.`,
    });
  }, [checkInMethod, isError, isLoading, matches, submittedQuery]);

  const stopScanner = useCallback(() => {
    scannerRunRef.current += 1;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setScannerState("idle");
    setCaptureState("idle");
    setCaptureInProgress(false);
    captureInProgressRef.current = false;
  }, []);

  const applyDecodedValue = useCallback((rawValue: string) => {
    const normalized = rawValue.trim();
    if (!normalized) return;

    setQuery(normalized);
    setSubmittedQuery(normalized);
    setCheckInMethod("qr");
    setActiveTicketToken(null);
    setVerificationResult(null);
    setCaptureState("verifying");
    setScannerMessage("QR detected. Verifying ticket…");
  }, []);

  const startScanner = async (deviceId = selectedCameraId, restart = false) => {
    if (!scannerSupported) {
      setScannerState("unsupported");
      setScannerMessage(window.isSecureContext ? "Camera access is unavailable in this browser. Use ticket search or image upload instead." : "Camera access requires HTTPS. Use the secure site or ticket search/image upload instead.");
      return;
    }

    if (scannerStartingRef.current || (scannerActive && !restart)) return;

    scannerStartingRef.current = true;
    stopScanner();
    const runId = scannerRunRef.current;
    setScannerState("requesting");
    setScannerMessage("Starting camera…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints(deviceId));

      if (runId !== scannerRunRef.current) {
        stopMediaStream(stream);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        throw new Error("The camera preview is not ready. Try starting the scanner again.");
      }

      streamRef.current = stream;
      await prepareVideoPreview(video, stream);

      if (runId !== scannerRunRef.current) {
        stopMediaStream(stream);
        return;
      }

      setScannerActive(true);
      setScannerState("active");
      setCaptureState("idle");
      setScannerMessage("Camera ready. Center the QR code and tap Capture and verify ticket.");

      try {
        const devices = await BrowserCodeReader.listVideoInputDevices();
        setCameraDevices(devices);
        if (!deviceId && devices.length > 0) {
          setSelectedCameraId(devices.find((device) => device.deviceId === stream.getVideoTracks()[0]?.getSettings().deviceId)?.deviceId ?? devices[0].deviceId);
        }
      } catch {
        // Camera enumeration is optional; the active stream remains usable.
      }
    } catch (error) {
      const cameraError = getCameraError(error);
      setScannerState(cameraError.state);
      setScannerMessage(cameraError.message);
      stopScanner();
      setScannerState(cameraError.state);
    } finally {
      scannerStartingRef.current = false;
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    stopScanner();
    setImageDecodeMessage("Decoding QR image…");

    try {
      const reader = readerRef.current ?? new BrowserQRCodeReader();
      readerRef.current = reader;
      applyDecodedValue(await decodeQrImage(reader, file));
      setImageDecodeMessage("QR image captured. Verifying ticket…");
    } catch {
      setImageDecodeMessage("No readable QR code was found in that image. Try a clearer ticket image or use manual search.");
    }
  };

  const captureAndVerify = async () => {
    if (!isCaptureAvailable(scannerActive, captureInProgressRef.current)) return;

    const video = videoRef.current;
    if (!video) {
      setCaptureState("error");
      setScannerMessage("The camera preview is not ready. Start the scanner again.");
      return;
    }

    captureInProgressRef.current = true;
    setCaptureInProgress(true);
    const runId = scannerRunRef.current;
    let awaitingVerification = false;

    try {
      setCapturedFrame(null);
      setCaptureState("capturing");
      setScannerMessage("Capturing image…");
      const reader = readerRef.current ?? new BrowserQRCodeReader();
      readerRef.current = reader;
      setCaptureState("reading");
      setScannerMessage("Reading QR code…");
      const decoded = decodeCapturedVideoFrame(reader, video);

      if (runId !== scannerRunRef.current) return;

      setCapturedFrame(decoded.imageDataUrl);
      setCaptureState("detected");
      setScannerMessage("QR detected. Verifying ticket…");
      applyDecodedValue(decoded.text);
      awaitingVerification = true;
    } catch (error) {
      if (runId !== scannerRunRef.current) return;

      setCaptureState(error instanceof CameraPreviewError ? "error" : "invalid");
      setScannerMessage(
        error instanceof CameraPreviewError
          ? error.message
          : "No QR code was found in the captured frame. Reposition the ticket and try again.",
      );
    } finally {
      if (!awaitingVerification) {
        captureInProgressRef.current = false;
        setCaptureInProgress(false);
      }
    }
  };

  useEffect(() => () => stopScanner(), [stopScanner]);

  const defaultScannerMessage = !scannerSupported
    ? "Camera scanning requires a secure connection and a browser with camera access. Use ticket search or image upload instead."
    : scannerState === "idle"
      ? "Camera permission has not been requested. Start the scanner when you are ready."
      : "Use the camera to scan a ticket QR code.";

  const searchTicket = () => {
    const normalized = query.trim();
    if (!normalized) {
      toast.error("Enter a ticket number, QR code, order number, buyer name, or phone number.");
      return;
    }

    setSubmittedQuery(normalized);
    setActiveTicketToken(null);
    setVerificationResult(null);
  };

  const checkInActiveTicket = async () => {
    if (!activeTicket) return;

    try {
      await checkInMutation.mutateAsync({
        query: activeTicket.publicTicketToken,
        method: checkInMethod,
      });
      toast.success("Guest checked in.");
      await refetch();
      setCaptureState("success");
      setScannerMessage("Check-in successful. Scan the next ticket when ready.");
      setVerificationResult({
        tone: "approved",
        title: "Check-in successful",
        message: `Ticket ${activeTicket.ticketNumber} has been checked in.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Guest could not be checked in. Try again.";
      toast.error(message);

      if (message.toLowerCase().includes("already")) {
        setCaptureState("duplicate");
        setScannerMessage("This ticket has already been checked in.");
        setVerificationResult({
          tone: "rejected",
          title: "Already checked in",
          message,
        });
        return;
      }

      if (message.toLowerCase().includes("not active") || message.toLowerCase().includes("revoked")) {
        setCaptureState("invalid");
        setScannerMessage("The ticket is not valid for check-in.");
        setVerificationResult({
          tone: "rejected",
          title: "Ticket not valid",
          message,
        });
        return;
      }

      setCaptureState("error");
      setScannerMessage("Network or server error while checking in the ticket. Try again.");
      setVerificationResult({
        tone: "rejected",
        title: "Verification failed",
        message,
      });
    }
  };

  const scanNextTicket = () => {
    setQuery("");
    setSubmittedQuery("");
    setActiveTicketToken(null);
    setVerificationResult(null);
    setCapturedFrame(null);
    setImageDecodeMessage("");
    setCaptureState("idle");
    setScannerMessage(scannerActive ? "Camera ready. Center the QR code and tap Capture and verify ticket." : "Start the camera before scanning the next ticket.");
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader title={contextEvent ? `${contextEvent.title} — Guest check-in` : "Guest check-in"} subtitle="Search for a ticket or scan its QR code, then record the guest’s entry." />

      {contextEvent && <AdminEventWorkspaceNav event={contextEvent} currentSection="guests" />}

      <AdminSectionCard title="Scan or search for a ticket">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-4 text-center">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-md border border-border bg-background">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live ticket QR camera"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-[16%] rounded-lg border-2 border-accent/80 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" aria-hidden="true" />
            {!scannerActive && <QrCode size={34} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground-secondary" aria-hidden="true" />}
            </div>
            <p className="mt-3 font-display text-sm text-foreground">
              {scannerActive ? "Camera ready" : "QR code scanner"}
            </p>
            <p className="mt-1 text-xs text-foreground-secondary" aria-live="polite" data-capture-state={captureState}>
              {scannerMessage || defaultScannerMessage}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={!scannerSupported || scannerActive || scannerState === "requesting"} onClick={() => void startScanner()}>
                Start scanner
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={!scannerActive} onClick={stopScanner}>
                Stop scanner
              </Button>
            </div>
            <Button
              type="button"
              size="lg"
              variant="accent"
              className="mt-3 min-h-12 w-full max-w-md justify-center"
              disabled={!isCaptureAvailable(scannerActive, captureInProgress)}
              onClick={() => void captureAndVerify()}
            >
              {captureInProgress ? "Reading ticket…" : "Capture and verify ticket"}
            </Button>
            {capturedFrame && (
              <div className="mx-auto mt-3 max-w-md rounded-md border border-border bg-background p-2 text-left">
                <img src={capturedFrame} alt="Captured ticket frame" className="aspect-[4/3] w-full rounded-sm object-contain" />
                <p className="mt-1 text-xs text-foreground-secondary">Captured frame</p>
              </div>
            )}
            {cameraDevices.length > 1 && (
              <label className="mx-auto mt-3 block max-w-md text-left">
                <span className={adminLabelClassName}>Camera</span>
                <select
                  value={selectedCameraId}
                  onChange={(event) => {
                    setSelectedCameraId(event.target.value);
                    if (scannerActive && !captureInProgress) void startScanner(event.target.value, true);
                  }}
                  className={adminInputClassName}
                  aria-label="Choose camera"
                >
                  {cameraDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="mt-4 border-t border-border pt-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => void handleImageUpload(event)}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => imageInputRef.current?.click()}>
                <Upload size={14} /> Upload QR image
              </Button>
              <p className="mt-1 text-xs text-foreground-secondary" aria-live="polite">
                {imageDecodeMessage || "Use a QR image from the phone gallery if camera scanning is unavailable."}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className={adminLabelClassName}>Find a ticket</span>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ticket number, QR code, order, buyer, or phone"
                  className={adminInputClassName}
                />
                <Button type="button" variant="accent" onClick={searchTicket} className="w-full sm:w-auto justify-center">
                  <Search size={14} /> Search
                </Button>
              </div>
              <p className={formHelperTextClassName}>Scan a ticket QR code or enter a ticket, order, or buyer detail.</p>
            </label>
            <label className="block">
              <span className={adminLabelClassName}>Check-in method</span>
              <select
                value={checkInMethod}
                onChange={(event) => setCheckInMethod(event.target.value as "manual" | "qr")}
                className={adminInputClassName}
              >
                <option value="manual">Manual check-in</option>
                <option value="qr">QR scan</option>
              </select>
            </label>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Matching tickets">
        {isLoading && <p className="text-sm text-foreground-secondary">Searching tickets…</p>}
        {isError && <EmptyState title="Ticket search failed" description="Ticket details could not be loaded. Check your connection and search again." />}
        {!isLoading && !isError && submittedQuery && matches.length === 0 && (
          <EmptyState title="No tickets found" description="Try another ticket number, order number, buyer name, or phone number." />
        )}
        {!isLoading && !isError && matches.length > 0 && (
          <div className="space-y-3">
            <div className="space-y-2">
              {matches.map((ticket) => (
                <button
                  key={ticket.publicTicketToken}
                  type="button"
                  onClick={() => setActiveTicketToken(ticket.publicTicketToken)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${
                    activeTicket?.publicTicketToken === ticket.publicTicketToken
                      ? "border-accent/45 bg-accent/10"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-foreground">{ticket.ticketNumber}</p>
                    <StatusBadge tone={ticketTone(ticket.ticketStatus)} label={formatAdminStatus(ticket.ticketStatus)} />
                  </div>
                  <p className="text-xs text-foreground-secondary mt-1">
                    {ticket.eventTitle} | {ticket.ticketTierName} | {ticket.buyerName} ({ticket.buyerPhone})
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </AdminSectionCard>

      <AdminSectionCard title="Ticket details">
        {!activeTicket && <EmptyState title="No ticket selected" description="Search and select a ticket to check in." />}
        {activeTicket && (
          <div className="space-y-4">
            {verificationResult && (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  verificationResult.tone === "approved"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : verificationResult.tone === "pending"
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-rose-300 bg-rose-50 text-rose-800"
                }`}
              >
                <p className="font-display text-xs tracking-[0.12em] uppercase">{verificationResult.title}</p>
                <p className="mt-1">{verificationResult.message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <p className="text-foreground-secondary"><span className="text-foreground">Ticket number:</span> {activeTicket.ticketNumber}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Order number:</span> {activeTicket.orderNumber}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Buyer:</span> {activeTicket.buyerName}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Phone:</span> {activeTicket.buyerPhone}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Event:</span> {activeTicket.eventTitle}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Tier:</span> {activeTicket.ticketTierName}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Issued:</span> {formatDateTime(activeTicket.issuedAt)}</p>
              <p className="text-foreground-secondary"><span className="text-foreground">Checked in:</span> {activeTicket.checkedInAt ? formatDateTime(activeTicket.checkedInAt) : "—"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={ticketTone(activeTicket.ticketStatus)} label={formatAdminStatus(activeTicket.ticketStatus)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="accent"
                onClick={() => void checkInActiveTicket()}
                disabled={checkInMutation.isPending || activeTicket.ticketStatus !== "active" || !canCheckIn}
              >
                {checkInMutation.isPending ? "Checking in…" : "Check in guest"}
              </Button>
              {verificationResult && checkInMethod === "qr" && (
                <Button type="button" variant="outline" onClick={scanNextTicket}>
                  Scan next ticket
                </Button>
              )}
              {!canCheckIn && (
                <p className="text-xs text-foreground-secondary">
                  Your account can view tickets but cannot check guests in.
                </p>
              )}
            </div>
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
