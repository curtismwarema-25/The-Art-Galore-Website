import { describe, expect, it, vi } from "vitest";
import { BrowserCodeReader } from "@zxing/browser";
import {
  CameraPreviewError,
  decodeCapturedVideoFrame,
  decodeQrImage,
  captureVideoFrame,
  getCameraConstraints,
  getCameraError,
  getTicketVerificationState,
  isCaptureAvailable,
  prepareVideoPreview,
  stopMediaStream,
} from "./qrScanner";

describe("QR scanner utilities", () => {
  it("prefers the rear camera without requiring an exact constraint", () => {
    expect(getCameraConstraints()).toEqual({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    expect(getCameraConstraints("camera-2")).toEqual({
      video: { deviceId: { ideal: "camera-2" } },
      audio: false,
    });
  });

  it("disables duplicate capture while a capture or verification is in progress", () => {
    expect(isCaptureAvailable(false, false)).toBe(false);
    expect(isCaptureAvailable(true, true)).toBe(false);
    expect(isCaptureAvailable(true, false)).toBe(true);
  });

  it.each([
    ["active", "valid"],
    ["checked_in", "duplicate"],
    ["revoked", "invalid"],
    ["cancelled", "invalid"],
  ])("maps backend ticket status %s to %s", (status, expected) => {
    expect(getTicketVerificationState(status)).toBe(expected);
  });

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "unavailable"],
    ["NotReadableError", "in-use"],
    ["UnknownError", "error"],
  ])("maps %s to the safe camera state %s", (name, state) => {
    expect(getCameraError(new DOMException("camera failure", name)).state).toBe(state);
  });

  it("reports a visible-preview error when playback is rejected", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { configurable: true, value: 1 });
    video.play = vi.fn().mockRejectedValue(new Error("autoplay blocked"));

    await expect(prepareVideoPreview(video, {} as MediaStream)).rejects.toBeInstanceOf(CameraPreviewError);
    expect(getCameraError(new CameraPreviewError("preview failed"))).toEqual({
      state: "error",
      message: "preview failed",
    });
  });

  it("attaches the stream and waits for video readiness before playback", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { configurable: true, value: 0 });
    video.play = vi.fn().mockResolvedValue(undefined);
    const stream = {} as MediaStream;

    const previewPromise = prepareVideoPreview(video, stream);
    expect(video.srcObject).toBe(stream);
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video.play).not.toHaveBeenCalled();

    video.dispatchEvent(new Event("loadedmetadata"));
    await previewPromise;
    expect(video.play).toHaveBeenCalledOnce();
  });

  it("captures the current video frame and decodes it with ZXing's canvas API", () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { configurable: true, value: 4 },
      videoWidth: { configurable: true, value: 640 },
      videoHeight: { configurable: true, value: 480 },
    });
    const canvas = { toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,captured") };
    const createCanvas = vi.spyOn(BrowserCodeReader, "createCanvasFromMediaElement").mockReturnValue(canvas as HTMLCanvasElement);
    const reader = {
      decodeFromCanvas: vi.fn().mockReturnValue({ getText: () => "agi-ticket:captured" }),
    };

    expect(decodeCapturedVideoFrame(reader as never, video)).toEqual({
      text: "agi-ticket:captured",
      imageDataUrl: "data:image/jpeg;base64,captured",
    });
    expect(createCanvas).toHaveBeenCalledWith(video);
    expect(reader.decodeFromCanvas).toHaveBeenCalledWith(canvas);

    createCanvas.mockRestore();
  });

  it("rejects a capture before the video has a usable frame", () => {
    const video = document.createElement("video");
    Object.defineProperties(video, {
      readyState: { configurable: true, value: 1 },
      videoWidth: { configurable: true, value: 0 },
      videoHeight: { configurable: true, value: 0 },
    });

    expect(() => captureVideoFrame(video)).toThrow(CameraPreviewError);
  });

  it("stops every track during scanner cleanup", () => {
    const stop = vi.fn();
    stopMediaStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    expect(stop).toHaveBeenCalledOnce();
  });

  it("decodes an uploaded QR image and revokes its object URL", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:qr-image");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const reader = {
      decodeFromImageElement: vi.fn().mockResolvedValue({ getText: () => "agi-ticket:test-token" }),
    };
    class MockImage {
      onload: (() => void) | undefined;
      onerror: (() => void) | undefined;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    await expect(decodeQrImage(reader as never, new File(["qr"], "ticket.png", { type: "image/png" }))).resolves.toBe("agi-ticket:test-token");
    expect(reader.decodeFromImageElement).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:qr-image");

    vi.unstubAllGlobals();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: undefined });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: undefined });
  });
});
