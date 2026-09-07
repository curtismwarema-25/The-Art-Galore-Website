import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { SettingsRepository } from "../src/modules/settings/settings.repository.js";

const repository = new SettingsRepository();

await repository.updateSettings({
  siteName: "The Art Galore International",
  tagline: "A Free Space to Connect Us All",
  contactEmail: "theartgaloreintl@gmail.com",
  contactPhone: "+254 759 292 496",
  supportContactText: "+254 700 533 716 / +254 758 732 652",
  instagramUrl: "https://www.instagram.com/the_art_galore_intl?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==",
  tiktokUrl: "https://www.tiktok.com/@the_art_galore?is_from_webapp=1&sender_device=pc",
  whatsappLink: "",
  xUrl: "",
  facebookUrl: "",
});

const settings = await prisma.siteSettings.findMany({
  where: { settingsKey: "default" },
  select: {
    id: true,
    settingsKey: true,
    siteName: true,
    tagline: true,
    contactEmail: true,
    contactPhone: true,
    supportContactText: true,
    instagramUrl: true,
    tiktokUrl: true,
    xUrl: true,
    facebookUrl: true,
    whatsappLink: true,
  },
});

console.log(JSON.stringify({ count: settings.length, settings }, null, 2));
await prisma.$disconnect();
