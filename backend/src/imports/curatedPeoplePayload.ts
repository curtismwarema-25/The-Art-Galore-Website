export type CuratedPersonInput = {
  fullName: string;
  preferredName: string | null;
  slug: string;
  pronunciation: string | null;
  email: string;
  phone: string;
  city: string;
  preferredContactMethod: string | null;
  organizationRole: string;
  category: "leadership" | "member";
  isArtist: boolean;
  primaryArtForm: string | null;
  secondaryArtForm: string | null;
  yearsPracticing: string | null;
  artistStatement: string | null;
  shortBio: string;
  longBio: string;
  quote: string | null;
  socials: Record<string, string>;
  eventsParticipatedRaw: string[];
  eventRolesRaw: string[];
  interestedInCollaborating: boolean;
  profilePhotoUrl: string | null;
  portfolioImagesUrl: string | null;
  additionalWorkUrl: string | null;
  consentGiven: boolean;
  displayOrder: number;
  importNotes?: string;
};

export const curatedPeoplePayload: CuratedPersonInput[] = [
  {
    fullName: "Bryson Wafula",
    preferredName: "FAVE-WRITE POET",
    slug: "bryson-wafula",
    pronunciation: null,
    email: "brysonwafula@gmail.com",
    phone: "254798963473",
    city: "Kisii",
    preferredContactMethod: "Phone Call",
    organizationRole: "Communications",
    category: "leadership",
    isArtist: true,
    primaryArtForm: "Poetry",
    secondaryArtForm: "Singer and Song Writer",
    yearsPracticing: "4 years in poetry; 12 years in music",
    artistStatement: null,
    shortBio:
      "Bryson Wafula is a poet, singer, and songwriter whose work blends humor, sharp honesty, and social commentary. He uses poetry to confront uncomfortable truths while keeping his voice accessible and memorable. His artistic journey moves between performance, music, and spoken word, making him one of the collective's most dynamic literary voices.",
    longBio:
      "Bryson Wafula is a passionate music lover, poet, songwriter, and performer whose life experiences have shaped a bold and unmistakable creative voice. He discovered his gift for singing while still in primary school and continued nurturing it through school assemblies, church services, and music competitions. Later, while in university, he leaned deeply into poetry and developed a style marked by wit, humor, and fearless commentary on difficult social realities. Today, he moves fluidly between poetry and music, co-writing songs and building work that provokes thought while staying grounded in performance energy.",
    quote: "What is a man without philosophy",
    socials: {
      instagram: "@b.r.yson_",
      tiktok: "bryson_the_poet",
      x: "@Bry_so_n",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Art Night", "Pajama Night", "Open Mic"],
    eventRolesRaw: ["Artist", "Performer", "Organizer"],
    interestedInCollaborating: true,
    profilePhotoUrl: null,
    portfolioImagesUrl: null,
    additionalWorkUrl: null,
    consentGiven: true,
    displayOrder: 1,
  },
  {
    fullName: "Maxwell Njoroge Kinyanjui",
    preferredName: "Max the Poet",
    slug: "maxwell-njoroge-kinyanjui",
    pronunciation: null,
    email: "anthonysmiths112m@gmail.com",
    phone: "798246019",
    city: "Kisii",
    preferredContactMethod: "Phone Call",
    organizationRole: "Member",
    category: "member",
    isArtist: true,
    primaryArtForm: "Rap / Spoken Word",
    secondaryArtForm: "Tattoo Art",
    yearsPracticing: "4 years",
    artistStatement: "Die to live for art.",
    shortBio:
      "Maxwell Njoroge Kinyanjui, also known as Max the Poet, is a spoken word artist with a strong love for language, performance, and creative self-expression. He approaches art as both identity and worldview, using words to carry emotion, rhythm, and personal truth. His practice also extends into tattoo artistry, reflecting a wider interest in visual and embodied creativity.",
    longBio:
      "Maxwell Njoroge Kinyanjui is a passionate lover of art who sees creativity not simply as a hobby, but as a way of understanding the world. Working primarily through rap and spoken word, he explores the power of language as an embodied art form that can move, provoke, and connect people. His work is shaped by ambition, imagination, and a clear commitment to artistic growth. Alongside performance, he also practices tattoo art, adding a visual dimension to his creative identity.",
    quote: "We don't sleep to walk on our dreams, while art is all I dream about.",
    socials: {
      instagram: "@thee.maxw3ll.",
      tiktok: "@theemaxxii1",
      facebook: "Maxwell Kinyanjui",
      x: "@King6209Maxwell",
      youtube: "Anthonysmith_P409U",
      website: "mkinya7thdx3p",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Pajama Night", "Other"],
    eventRolesRaw: ["Artist", "Performer"],
    interestedInCollaborating: true,
    profilePhotoUrl: "https://drive.google.com/open?id=1SHPao0kzp34g_rblq_5M7OulWBKfTtWH",
    portfolioImagesUrl: "https://drive.google.com/open?id=1_5MvO-LJGdleLL4FAEvzZzB1uWyFZA5m",
    additionalWorkUrl: "mkinya7thdx3p",
    consentGiven: true,
    displayOrder: 2,
    importNotes: "Email appears unusual relative to the name; import it as provided but flag for manual review in admin.",
  },
  {
    fullName: "Violet Kwamboka",
    preferredName: "Miss.Kwamboka",
    slug: "violet-kwamboka",
    pronunciation: null,
    email: "vkwamboka51@gmail.com",
    phone: "758732652",
    city: "Kisii Town",
    preferredContactMethod: "Phone Call",
    organizationRole: "Chairlady",
    category: "leadership",
    isArtist: true,
    primaryArtForm: "Poetry",
    secondaryArtForm: null,
    yearsPracticing: "6 years",
    artistStatement:
      "In the quiet spaces between words and silence, I find the rhythm of existence. As a poet-artist, I explore the interplay of language and imagery, seeking to capture the intangible emotions that shape our human experience. My work is a dialogue between the written and the visual, where poetry becomes a canvas and color becomes a verse. I create not just to express but to connect, to share the quiet, the profound, and the beautifully unspoken.",
    shortBio:
      "Violet Kwamboka is a poet, educator, leader, actress, and stage-play director whose work blends art with purpose. As Chairlady of Art Galore International, she helps shape the collective's vision while also using poetry and performance to inspire, teach, and connect communities. Her creative practice is rooted in empathy, language, and the power of storytelling.",
    longBio:
      "Violet Kwamboka brings together leadership, literature, performance, and education in a way that gives her work both depth and reach. She is a poet, an English and Literature teacher, an actress, a stage-play director, and an emerging curator of events. Her art is grounded in the belief that language can reveal what is often left unspoken, and that performance can move people toward understanding and connection. Within Art Galore International, she plays a central organizing role while continuing to cultivate a creative voice that is reflective, purposeful, and deeply human.",
    quote: "In the act of speaking, we become the story.",
    socials: {
      instagram: "@Miss_kwamboka",
      tiktok: "@miss.vayolahkwamboka",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Art Night", "Pajama Night", "Open Mic", "Other"],
    eventRolesRaw: ["Performer", "Organizer", "Volunteer"],
    interestedInCollaborating: true,
    profilePhotoUrl: null,
    portfolioImagesUrl: null,
    additionalWorkUrl: null,
    consentGiven: true,
    displayOrder: 3,
  },
  {
    fullName: "John Saruni Kimori",
    preferredName: "Quavo / Guevara / Nyeusi",
    slug: "john-saruni-kimori",
    pronunciation: null,
    email: "johnsaruni456@gmail.com",
    phone: "795010492",
    city: "Kisii",
    preferredContactMethod: "Phone Call",
    organizationRole: "Member",
    category: "member",
    isArtist: true,
    primaryArtForm: "Performance Art",
    secondaryArtForm: "Drawing",
    yearsPracticing: "1 year",
    artistStatement: null,
    shortBio:
      "John Saruni Kimori is a performance-driven creative with interests in fashion, modeling, and visual expression. As a student and active member of the collective, he brings style, presence, and emerging artistic energy into Art Galore International spaces. His work sits at the intersection of performance, image, and self-expression.",
    longBio:
      "John Saruni Kimori is an emerging artist whose creative identity is shaped by performance, fashion, and visual presence. A university student with a growing love for art, he approaches creative work through a strong sense of image, individuality, and stage awareness. He is especially drawn to performance-based expression while also exploring drawing as a visual form. Within Art Galore International, he contributes as both a participant and organizer, building a practice that is still young but full of promise.",
    quote: "Be the change you wish to see in the world.",
    socials: {
      instagram: "_sa.runi_k.j",
      tiktok: "_sa.runi_k.j",
      x: "John saruni",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Pajama Night", "Other"],
    eventRolesRaw: ["Performer", "Organizer", "Volunteer"],
    interestedInCollaborating: true,
    profilePhotoUrl: null,
    portfolioImagesUrl: null,
    additionalWorkUrl: null,
    consentGiven: true,
    displayOrder: 4,
  },
  {
    fullName: "Kirstie Muchugia",
    preferredName: "MUCHUGIA",
    slug: "kirstie-muchugia",
    pronunciation: "mu-sho-gia",
    email: "muchugiakirstie8@gmail.com",
    phone: "254723890008",
    city: "Kisii",
    preferredContactMethod: "Email",
    organizationRole: "Member",
    category: "member",
    isArtist: true,
    primaryArtForm: "Painting",
    secondaryArtForm: "Creative Makeup",
    yearsPracticing: "4 years",
    artistStatement: null,
    shortBio:
      "Kirstie Muchugia is a painter and creative whose work is driven by storytelling, reinvention, and emotional connection. She is passionate about transforming overlooked materials and experiences into meaningful artistic narratives. Her practice blends visual art, creativity, and community-minded expression in a way that feels both thoughtful and fresh.",
    longBio:
      "Kirstie Muchugia believes that nothing is truly disposable and that everything carries the possibility of a new chapter. Guided by the eye of a creator rather than that of a consumer, she finds joy in giving fresh life to what has been forgotten. Her background in Business Information and Management adds a practical and strategic layer to her artistic journey, helping her think not only about making art, but also about how it reaches people. Alongside her love for painting, she is inspired by travel, networking, and community connection, all of which feed her desire to create work that sparks conversation and shared meaning.",
    quote: "I am here to share stories, one piece at a time.",
    socials: {
      instagram: "@k.muchugia",
      tiktok: "m.muchugia",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Art Night", "Pajama Night", "Open Mic", "Other"],
    eventRolesRaw: ["Artist", "Organizer"],
    interestedInCollaborating: true,
    profilePhotoUrl: "https://drive.google.com/open?id=1b3K80DmvL-i6Bj81UvWc1KMZyKlDmhy6",
    portfolioImagesUrl: "https://drive.google.com/open?id=16yDo0oS5JMEKk6rWnze-ibdV_xyHdDAW",
    additionalWorkUrl: null,
    consentGiven: true,
    displayOrder: 5,
  },
  {
    fullName: "Anthony Kebabe",
    preferredName: "Sop",
    slug: "anthony-kebabe",
    pronunciation: null,
    email: "kebabeanthony@gmail.com",
    phone: "759292496",
    city: "Kisii",
    preferredContactMethod: null,
    organizationRole: "Public Relations",
    category: "leadership",
    isArtist: true,
    primaryArtForm: "Rap / Spoken Word",
    secondaryArtForm: null,
    yearsPracticing: "5 years",
    artistStatement: null,
    shortBio:
      "Anthony Kebabe is a spoken word and rap artist committed to sharpening both his craft and the creative ecosystem around him. As Public Relations lead within Art Galore International, he plays an important role in connecting the collective to its audience while also developing his own artistic voice. His work is marked by adaptability, curiosity, and a belief in the breadth of art.",
    longBio:
      "Anthony Kebabe is a flexible and evolving artist whose creative practice centers on rap, spoken word, and cultural expression. He sees art as something expansive and living, and he approaches his growth as both a personal journey and a contribution to a wider artistic community. Within Art Galore International, he serves in Public Relations, helping shape how the collective speaks to its audience and presents its work. He is equally comfortable performing, organizing, and hosting, which makes him a valuable bridge between the stage and the community around it.",
    quote: "Art is wide.",
    socials: {
      instagram: "This.is.kebabe",
      tiktok: "This.is.kebabe",
      facebook: "This.is.kebabe",
      youtube: "This is kebabe",
    },
    eventsParticipatedRaw: ["Sip & Paint", "Art Night", "Pajama Night", "Open Mic"],
    eventRolesRaw: ["Performer", "Organizer", "Host / MC"],
    interestedInCollaborating: true,
    profilePhotoUrl: null,
    portfolioImagesUrl: null,
    additionalWorkUrl: null,
    consentGiven: true,
    displayOrder: 6,
  },
];
