import { describe, expect, it, vi } from "vitest";
import {
  decodeQrImage,
  getCameraConstraints,
  getCameraError,
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

  it.each([
    ["NotAllowedError", "denied"],
    ["NotFoundError", "unavailable"],
    ["NotReadableError", "in-use"],
    ["UnknownError", "error"],
  ])("maps %s to the safe camera state %s", (name, state) => {
    expect(getCameraError(new DOMException("camera failure", name)).state).toBe(state);
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
