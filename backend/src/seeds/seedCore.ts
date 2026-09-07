import { PartnerPlacementContext, UserStatus, type PrismaClient } from "@prisma/client";
import { hashPassword } from "../common/auth/password.js";
import type { SeedBundle, SeedOptions } from "./types.js";

export async function runSeed(prisma: PrismaClient, seedData: SeedBundle, options?: SeedOptions) {
  const personIdBySlug = new Map<string, string>();
  const partnerIdBySlug = new Map<string, string>();
  const eventIdBySlug = new Map<string, string>();

  for (const person of seedData.people) {
    const upsertedPerson = await prisma.person.upsert({
      where: { slug: person.slug },
      update: {
        fullName: person.fullName,
        headline: person.headline,
        bio: person.bio,
        medium: person.medium,
        status: person.status,
        displayOrder: person.displayOrder ?? 0,
      },
      create: {
        slug: person.slug,
        fullName: person.fullName,
        headline: person.headline,
        bio: person.bio,
        medium: person.medium,
        status: person.status,
        displayOrder: person.displayOrder ?? 0,
      },
    });

    personIdBySlug.set(person.slug, upsertedPerson.id);

    await prisma.personRole.deleteMany({ where: { personId: upsertedPerson.id } });
    if (person.roles.length > 0) {
      await prisma.personRole.createMany({
        data: person.roles.map((role) => ({
          personId: upsertedPerson.id,
          role: role.role,
          title: role.title,
        })),
      });
    }

    await prisma.personFeaturedWork.deleteMany({ where: { personId: upsertedPerson.id } });
    if (person.featuredWorks.length > 0) {
      await prisma.personFeaturedWork.createMany({
        data: person.featuredWorks.map((work, index) => ({
          personId: upsertedPerson.id,
          title: work.title,
          description: work.description,
          sortOrder: work.sortOrder ?? index + 1,
        })),
      });
    }
  }

  for (const partner of seedData.partners) {
    const upsertedPartner = await prisma.partner.upsert({
      where: { slug: partner.slug },
      update: {
        name: partner.name,
        description: partner.description,
        partnershipType: partner.partnershipType,
        website: partner.website,
        logoText: partner.logoText,
        status: partner.status,
        displayOrder: partner.displayOrder ?? 0,
      },
      create: {
        slug: partner.slug,
        name: partner.name,
        description: partner.description,
        partnershipType: partner.partnershipType,
        website: partner.website,
        logoText: partner.logoText,
        status: partner.status,
        displayOrder: partner.displayOrder ?? 0,
      },
    });

    partnerIdBySlug.set(partner.slug, upsertedPartner.id);
  }

  for (const event of seedData.events) {
    const upsertedEvent = await prisma.event.upsert({
      where: { slug: event.slug },
      update: {
        title: event.title,
        eventType: event.eventType,
        summary: event.summary,
        description: event.description,
        startAt: new Date(event.startAt),
        endAt: new Date(event.endAt),
        timezone: event.timezone,
        venueName: event.venueName,
        capacity: event.capacity,
        status: event.status,
        displayOrder: event.displayOrder ?? 0,
      },
      create: {
        slug: event.slug,
        title: event.title,
        eventType: event.eventType,
        summary: event.summary,
        description: event.description,
        startAt: new Date(event.startAt),
        endAt: new Date(event.endAt),
        timezone: event.timezone,
        venueName: event.venueName,
        capacity: event.capacity,
        status: event.status,
        displayOrder: event.displayOrder ?? 0,
      },
    });

    eventIdBySlug.set(event.slug, upsertedEvent.id);

    await prisma.eventHighlight.deleteMany({ where: { eventId: upsertedEvent.id } });
    if (event.highlights.length > 0) {
      await prisma.eventHighlight.createMany({
        data: event.highlights.map((highlight, index) => ({
          eventId: upsertedEvent.id,
          text: highlight.text,
          sortOrder: highlight.sortOrder ?? index + 1,
        })),
      });
    }

    await prisma.eventLineupItem.deleteMany({ where: { eventId: upsertedEvent.id } });
    if (event.lineup.length > 0) {
      await prisma.eventLineupItem.createMany({
        data: event.lineup.map((lineupItem, index) => ({
          eventId: upsertedEvent.id,
          personId: lineupItem.personSlug ? personIdBySlug.get(lineupItem.personSlug) : undefined,
          displayName: lineupItem.displayName,
          roleLabel: lineupItem.roleLabel,
          sortOrder: lineupItem.sortOrder ?? index + 1,
        })),
      });
    }

    for (const ticketTier of event.ticketTiers) {
      const upsertedTier = await prisma.ticketTier.upsert({
        where: { slug: ticketTier.slug },
        update: {
          eventId: upsertedEvent.id,
          name: ticketTier.name,
          description: ticketTier.description,
          price: ticketTier.price,
          currency: ticketTier.currency ?? "KES",
          availableQuantity: ticketTier.availableQuantity,
          maxPerOrder: ticketTier.maxPerOrder,
          saleStartAt: ticketTier.saleStartAt ? new Date(ticketTier.saleStartAt) : null,
          saleEndAt: ticketTier.saleEndAt ? new Date(ticketTier.saleEndAt) : null,
          status: ticketTier.status,
          sortOrder: ticketTier.sortOrder ?? 0,
        },
        create: {
          eventId: upsertedEvent.id,
          slug: ticketTier.slug,
          name: ticketTier.name,
          description: ticketTier.description,
          price: ticketTier.price,
          currency: ticketTier.currency ?? "KES",
          availableQuantity: ticketTier.availableQuantity,
          maxPerOrder: ticketTier.maxPerOrder,
          saleStartAt: ticketTier.saleStartAt ? new Date(ticketTier.saleStartAt) : null,
          saleEndAt: ticketTier.saleEndAt ? new Date(ticketTier.saleEndAt) : null,
          status: ticketTier.status,
          sortOrder: ticketTier.sortOrder ?? 0,
        },
      });

      await prisma.ticketTierPerk.deleteMany({ where: { ticketTierId: upsertedTier.id } });
      if (ticketTier.perks.length > 0) {
        await prisma.ticketTierPerk.createMany({
          data: ticketTier.perks.map((perk, index) => ({
            ticketTierId: upsertedTier.id,
            label: perk.label,
            sortOrder: perk.sortOrder ?? index + 1,
          })),
        });
      }
    }

    await prisma.galleryImage.deleteMany({ where: { eventId: upsertedEvent.id } });
    if (event.galleryImages.length > 0) {
      await prisma.galleryImage.createMany({
        data: event.galleryImages.map((image, index) => ({
          eventId: upsertedEvent.id,
          caption: image.caption,
          imageUrl: image.imageUrl,
          storageKey: image.storageKey,
          mimeType: image.mimeType,
          featured: image.featured ?? false,
          sortOrder: image.sortOrder ?? index + 1,
          isActive: image.isActive ?? true,
        })),
      });
    }

    for (const partnerSlug of event.supportedPartnerSlugs) {
      const partnerId = partnerIdBySlug.get(partnerSlug);
      if (!partnerId) continue;

      await prisma.partnerPlacement.upsert({
        where: {
          partnerId_context_contextKey: {
            partnerId,
            context: PartnerPlacementContext.EVENT,
            contextKey: event.slug,
          },
        },
        update: {
          eventId: upsertedEvent.id,
          displayOrder: 0,
          isActive: true,
        },
        create: {
          partnerId,
          context: PartnerPlacementContext.EVENT,
          contextKey: event.slug,
          eventId: upsertedEvent.id,
          displayOrder: 0,
          isActive: true,
        },
      });
    }
  }

  for (const partner of seedData.partners) {
    const partnerId = partnerIdBySlug.get(partner.slug);
    if (!partnerId) continue;

    for (const placement of partner.placements) {
      const eventId = placement.eventSlug ? eventIdBySlug.get(placement.eventSlug) : undefined;

      await prisma.partnerPlacement.upsert({
        where: {
          partnerId_context_contextKey: {
            partnerId,
            context: placement.context,
            contextKey: placement.contextKey,
          },
        },
        update: {
          eventId,
          displayOrder: placement.displayOrder ?? 0,
          isActive: placement.isActive ?? true,
        },
        create: {
          partnerId,
          context: placement.context,
          contextKey: placement.contextKey,
          eventId,
          displayOrder: placement.displayOrder ?? 0,
          isActive: placement.isActive ?? true,
        },
      });
    }
  }

  const featuredEventId = seedData.siteSettings.featuredEventSlug
    ? eventIdBySlug.get(seedData.siteSettings.featuredEventSlug)
    : undefined;

  await prisma.siteSettings.upsert({
    where: { settingsKey: seedData.siteSettings.settingsKey },
    update: {
      siteName: seedData.siteSettings.siteName,
      tagline: seedData.siteSettings.tagline,
      footerText: seedData.siteSettings.footerText,
      contactEmail: seedData.siteSettings.contactEmail,
      contactPhone: seedData.siteSettings.contactPhone,
      supportContactText: seedData.siteSettings.supportContactText,
      whatsappLink: seedData.siteSettings.whatsappLink,
      instagramUrl: seedData.siteSettings.instagramUrl,
      tiktokUrl: seedData.siteSettings.tiktokUrl,
      xUrl: seedData.siteSettings.xUrl,
      facebookUrl: seedData.siteSettings.facebookUrl,
      heroTitle: seedData.siteSettings.heroTitle,
      heroSubtitle: seedData.siteSettings.heroSubtitle,
      featuredEventId,
      defaultMetaTitle: seedData.siteSettings.defaultMetaTitle,
      defaultMetaDescription: seedData.siteSettings.defaultMetaDescription,
      defaultSocialPreviewImageUrl: seedData.siteSettings.defaultSocialPreviewImageUrl,
      privacyPolicyLink: seedData.siteSettings.privacyPolicyLink,
      termsLink: seedData.siteSettings.termsLink,
      refundPolicyLink: seedData.siteSettings.refundPolicyLink,
    },
    create: {
      settingsKey: seedData.siteSettings.settingsKey,
      siteName: seedData.siteSettings.siteName,
      tagline: seedData.siteSettings.tagline,
      footerText: seedData.siteSettings.footerText,
      contactEmail: seedData.siteSettings.contactEmail,
      contactPhone: seedData.siteSettings.contactPhone,
      supportContactText: seedData.siteSettings.supportContactText,
      whatsappLink: seedData.siteSettings.whatsappLink,
      instagramUrl: seedData.siteSettings.instagramUrl,
      tiktokUrl: seedData.siteSettings.tiktokUrl,
      xUrl: seedData.siteSettings.xUrl,
      facebookUrl: seedData.siteSettings.facebookUrl,
      heroTitle: seedData.siteSettings.heroTitle,
      heroSubtitle: seedData.siteSettings.heroSubtitle,
      featuredEventId,
      defaultMetaTitle: seedData.siteSettings.defaultMetaTitle,
      defaultMetaDescription: seedData.siteSettings.defaultMetaDescription,
      defaultSocialPreviewImageUrl: seedData.siteSettings.defaultSocialPreviewImageUrl,
      privacyPolicyLink: seedData.siteSettings.privacyPolicyLink,
      termsLink: seedData.siteSettings.termsLink,
      refundPolicyLink: seedData.siteSettings.refundPolicyLink,
    },
  });

  if (options?.adminUser.enabled) {
    const adminEmail = options.adminUser.email.trim().toLowerCase();
    const passwordHash = await hashPassword(options.adminUser.password);

    await prisma.authUser.upsert({
      where: { email: adminEmail },
      update: {
        fullName: options.adminUser.fullName,
        role: options.adminUser.role,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
      create: {
        email: adminEmail,
        fullName: options.adminUser.fullName,
        role: options.adminUser.role,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });
  }
}
