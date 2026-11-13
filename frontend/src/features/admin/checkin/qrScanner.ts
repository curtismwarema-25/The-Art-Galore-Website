import type { BrowserQRCodeReader } from "@zxing/browser";

export type CameraState =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "in-use"
  | "unsupported"
  | "error";

export class CameraPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CameraPreviewError";
  }
}

export function isCameraContextSupported() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  if (typeof window === "undefined") return false;

  return window.isSecureContext || ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
}

export function getCameraConstraints(deviceId?: string): MediaStreamConstraints {
  return {
    video: deviceId
      ? { deviceId: { ideal: deviceId } }
      : { facingMode: { ideal: "environment" } },
    audio: false,
  };
}

export function getCameraError(error: unknown): { state: Exclude<CameraState, "idle" | "requesting" | "active">; message: string } {
  if (error instanceof CameraPreviewError) {
    return { state: "error", message: error.message };
  }

  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || name === "SecurityError") {
    return {
      state: "denied",
      message: "Camera access was denied. Allow camera access for this site in your browser settings, then try again.",
    };
  }

  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      state: "unavailable",
      message: "No usable camera was found. Check the device camera and use ticket search or image upload instead.",
    };
  }

  if (name === "NotReadableError" || name === "AbortError") {
    return {
      state: "in-use",
      message: "The camera is already in use by another app or browser tab. Close it there and try again.",
    };
  }

  return {
    state: "error",
    message: "The camera could not be started. Check browser permissions and use ticket search or image upload instead.",
  };
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function prepareVideoPreview(video: HTMLVideoElement, stream: MediaStream, timeoutMs = 5000) {
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  if (video.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeoutId);
        video.removeEventListener("loadedmetadata", handleReady);
        video.removeEventListener("canplay", handleReady);
        video.removeEventListener("error", handleError);
      };
      const handleReady = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new CameraPreviewError("The camera opened, but its preview could not be initialized. Try again or use image upload."));
      };

      video.addEventListener("loadedmetadata", handleReady, { once: true });
      video.addEventListener("canplay", handleReady, { once: true });
      video.addEventListener("error", handleError, { once: true });
      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new CameraPreviewError("The camera opened, but its preview did not become ready. Try again or use image upload."));
      }, timeoutMs);
    });
  }

  try {
    await video.play();
  } catch {
    throw new CameraPreviewError("Camera access was granted, but the live preview could not start. Tap Start scanner again or use image upload.");
  }
}

export async function decodeQrImage(reader: BrowserQRCodeReader, file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The QR image could not be loaded."));
      image.src = url;
    });

    const result = await reader.decodeFromImageElement(image);
    const text = result.getText().trim();
    if (!text) throw new Error("No QR code was found in that image.");
    return text;
  } finally {
    URL.revokeObjectURL(url);
  }
}
