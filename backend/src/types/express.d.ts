import type { AuthSessionContext } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthSessionContext;
    }
  }
}

export {};
