import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
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
  decodeQrImage,
  getCameraConstraints,
  getCameraError,
  isCameraContextSupported,
  prepareVideoPreview,
  stopMediaStream,
  type CameraState,
} from "./qrScanner";
import AdminEventWorkspaceNav from "../events/AdminEventWorkspaceNav";

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
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const scannerRunRef = useRef(0);
  const scannerStartingRef = useRef(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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

    if (isError) {
      setVerificationResult({
        tone: "rejected",
        title: "Search failed",
        message: "Ticket details could not be loaded. Check your connection and search again.",
      });
      return;
    }

    if (matches.length === 0) {
      setVerificationResult({
        tone: "rejected",
        title: "Invalid ticket",
        message: "No ticket matched that token, QR payload, or search query.",
      });
      return;
    }

    const firstMatch = matches[0];
    if (firstMatch.ticketStatus === "active") {
      setVerificationResult({
        tone: "approved",
        title: "Valid ticket found",
        message: `Ticket ${firstMatch.ticketNumber} is active and can be checked in.`,
      });
      return;
    }

    if (firstMatch.ticketStatus === "checked_in") {
      setVerificationResult({
        tone: "rejected",
        title: "Already checked in",
        message: `Ticket ${firstMatch.ticketNumber} has already been used.`,
      });
      return;
    }

    setVerificationResult({
      tone: "rejected",
      title: "Ticket not valid",
      message: `Ticket ${firstMatch.ticketNumber} is ${firstMatch.ticketStatus}.`,
    });
  }, [isError, isLoading, matches, submittedQuery]);

  const stopScanner = useCallback(() => {
    scannerRunRef.current += 1;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
    setScannerState("idle");
  }, []);

  const handleDecodedValue = useCallback((rawValue: string) => {
    const normalized = rawValue.trim();
    if (!normalized) return;

    setQuery(normalized);
    setSubmittedQuery(normalized);
    setCheckInMethod("qr");
    setActiveTicketToken(null);
    setVerificationResult(null);
    setScannerMessage("QR code captured. Verifying ticket…");
    stopScanner();
  }, [stopScanner]);

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
    setScannerMessage("Requesting camera access…");

    try {
      const reader = readerRef.current ?? new BrowserQRCodeReader();
      readerRef.current = reader;
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

      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (result) handleDecodedValue(result.getText());
      });

      if (runId !== scannerRunRef.current) {
        controls.stop();
        stopMediaStream(stream);
        return;
      }

      scannerControlsRef.current = controls;
      setScannerActive(true);
      setScannerState("active");
      setScannerMessage("Camera active. Point it at a ticket QR code.");

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
      handleDecodedValue(await decodeQrImage(reader, file));
      setImageDecodeMessage("QR image captured. Verifying ticket…");
    } catch {
      setImageDecodeMessage("No readable QR code was found in that image. Try a clearer ticket image or use manual search.");
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
      setVerificationResult({
        tone: "approved",
        title: "Check-in successful",
        message: `Ticket ${activeTicket.ticketNumber} has been checked in.`,
      });
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Guest could not be checked in. Try again.";
      toast.error(message);

      if (message.toLowerCase().includes("already")) {
        setVerificationResult({
          tone: "rejected",
          title: "Already checked in",
          message,
        });
        return;
      }

      if (message.toLowerCase().includes("not active") || message.toLowerCase().includes("revoked")) {
        setVerificationResult({
          tone: "rejected",
          title: "Ticket not valid",
          message,
        });
        return;
      }

      setVerificationResult({
        tone: "rejected",
        title: "Verification failed",
        message,
      });
    }
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <SectionHeader title={contextEvent ? `${contextEvent.title} — Guest check-in` : "Guest check-in"} subtitle="Search for a ticket or scan its QR code, then record the guest’s entry." />

      {contextEvent && <AdminEventWorkspaceNav event={contextEvent} currentSection="guests" />}

      <AdminSectionCard title="Scan or search for a ticket">
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
          <div className="rounded-md border border-dashed border-border bg-secondary/20 p-4 text-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              aria-label="Live ticket QR camera"
              className="mx-auto aspect-video w-full max-w-md min-h-48 rounded-md border border-border bg-background object-cover"
            />
            {!scannerActive && <QrCode size={34} className="mx-auto text-foreground-secondary my-3" />}
            <p className="mt-3 font-display text-sm text-foreground">
              {scannerActive ? "Scanning QR code" : "QR code scanner"}
            </p>
            <p className="mt-1 text-xs text-foreground-secondary" aria-live="polite">
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
            {cameraDevices.length > 1 && (
              <label className="mx-auto mt-3 block max-w-md text-left">
                <span className={adminLabelClassName}>Camera</span>
                <select
                  value={selectedCameraId}
                  onChange={(event) => {
                    setSelectedCameraId(event.target.value);
                    if (scannerActive) void startScanner(event.target.value, true);
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
