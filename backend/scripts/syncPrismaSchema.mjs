import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceSchema = resolve(__dirname, "../prisma/schema.prisma");
const targetSchema = resolve(__dirname, "../../frontend/prisma/schema.prisma");

mkdirSync(dirname(targetSchema), { recursive: true });
copyFileSync(sourceSchema, targetSchema);

console.log(`Synced Prisma schema -> ${targetSchema}`);
