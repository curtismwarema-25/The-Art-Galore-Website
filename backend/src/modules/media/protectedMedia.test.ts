import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import cookieParser from "cookie-parser";
import express from "express";
import { UserRole, UserStatus } from "@prisma/client";
import type { AuthSessionContext } from "../auth/auth.types.js";
import { getSessionCookieName } from "../../common/auth/session.js";
import { AppError } from "../../common/errors/AppError.js";
import { createProtectedMediaMiddleware } from "./protectedMedia.js";

async function withMediaServer(run: (baseUrl: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "agi-media-test-"));
  await mkdir(join(root, "payment-proof"), { recursive: true });
  await mkdir(join(root, "community"), { recursive: true });
  await writeFile(join(root, "payment-proof", "proof.txt"), "protected proof");
  await writeFile(join(root, "community", "public.txt"), "public media");

  const app = express();
  app.use(cookieParser());
  app.use(
    "/media/files",
    createProtectedMediaMiddleware(root, {
      resolveSession: async (token) =>
        token === "admin-session"
          ? {
              sessionId: "session-1",
              expiresAt: new Date(Date.now() + 60_000),
              user: {
                id: "admin-1",
                email: "admin@example.test",
                fullName: "Test Admin",
                role: UserRole.ADMIN,
                status: UserStatus.ACTIVE,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            }
          : null,
    }),
  );
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = error instanceof AppError ? error.statusCode : 500;
    res.status(status).end();
  });

  const server = http.createServer(app);
  try {
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP address");
    }
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    await rm(root, { recursive: true, force: true });
  }
}

test("payment-proof media rejects unauthenticated requests", async () => {
  await withMediaServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/media/files/payment-proof/proof.txt`);
    assert.equal(response.status, 401);
  });
});

test("payment-proof media allows an authorized admin session", async () => {
  await withMediaServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/media/files/payment-proof/proof.txt`, {
      headers: { Cookie: `${getSessionCookieName()}=admin-session` },
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "protected proof");
  });
});

test("public community media remains publicly readable", async () => {
  await withMediaServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/media/files/community/public.txt`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "public media");
  });
});
