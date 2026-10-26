import type { Response } from "express";

export async function imageMediaResponse(res: Response, filePath: string) {
  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Content-Disposition": "inline",
  });
  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) res.status(404).json({ error: "Media not found" });
  });
}
