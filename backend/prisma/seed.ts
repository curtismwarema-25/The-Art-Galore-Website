import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";
import { localSeedData } from "../src/seeds/data-sources/index.js";
import { runSeed } from "../src/seeds/seedCore.js";

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  SEED_ADMIN_ENABLED: z.coerce.boolean().default(true),
  SEED_ADMIN_EMAIL: z.string().email().default("admin@local.test"),
  SEED_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  SEED_ADMIN_FULL_NAME: z.string().min(2).default("Local Admin"),
  SEED_ADMIN_ROLE: z.nativeEnum(UserRole).default(UserRole.ADMIN),
});

async function main() {
  const seedEnv = seedEnvSchema.parse(process.env);

  await runSeed(prisma, localSeedData, {
    adminUser: {
      enabled: seedEnv.SEED_ADMIN_ENABLED,
      email: seedEnv.SEED_ADMIN_EMAIL,
      password: seedEnv.SEED_ADMIN_PASSWORD,
      fullName: seedEnv.SEED_ADMIN_FULL_NAME,
      role: seedEnv.SEED_ADMIN_ROLE,
    },
  });
}

main()
  .then(async () => {
    console.log("Seed complete.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed.", error);
    await prisma.$disconnect();
    process.exit(1);
  });
