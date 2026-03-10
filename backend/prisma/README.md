Backend-local Prisma assets.

- Working schema path for CLI commands: `backend/prisma/schema.prisma`
- Source-of-truth schema path: `prisma/schema.prisma`
- Schema sync command: `npm run prisma:sync-schema`
- Seed entrypoint: `backend/prisma/seed.ts`

Do not edit `backend/prisma/schema.prisma` directly; it is generated from the root schema.
