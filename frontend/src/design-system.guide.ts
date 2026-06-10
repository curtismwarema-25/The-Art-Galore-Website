/**
 * Light Mode Design System Guide
 * 
 * Lavender & Midnight Palette - Editorial Minimalism
 * ================================================
 * 
 * COLOR HIERARCHY:
 * 
 * 1. BACKGROUNDS & SPACE
 *    └─ bg-brand-bg (#FFFFFF)
 *       Primary clean editorial background. Generous negative space.
 *       Use: Full sections, body background, all containers
 * 
 *    └─ bg-brand-surface (#E8E4F5)
 *       Soft lavender for secondary content. Creates subtle depth.
 *       Use: Cards, section blocks, loading skeletons, inset elements
 * 
 * 2. TYPOGRAPHY
 *    └─ text-brand-text (#141738)
 *       Deep midnight for all primary text. Maximum contrast on white.
 *       Use: Headlines (h1-h6), body text, primary CTAs
 * 
 *    └─ text-brand-muted (#3E458D)
 *       Mid-tone indigo for secondary information.
 *       Use: Subtitles, metadata, helper text, secondary labels
 * 
 * 3. INTERACTIVE & ACCENT
 *    └─ bg-brand-accent (#7B6AB5)
 *       Royal purple for primary buttons, active states.
 *       Use: Primary buttons, active links, focus states, accents
 * 
 *    └─ border-brand-surface
 *       Subtle lavender for borders and dividers.
 *       Use: Horizontal rules, card borders, input fields
 * 
 * ================================================
 * COMPONENT PATTERNS
 * ================================================
 */

/* ===== TAILWIND UTILITY CLASSES ===== */

/*
BACKGROUNDS:
- bg-brand-bg          → Pure white primary background
- bg-brand-surface     → Soft lavender secondary background
- bg-brand-accent      → Royal purple (interactive elements)
- bg-brand-text        → Deep midnight (rarely used for bg)

TEXT & COLORS:
- text-brand-text      → Deep midnight (default body text)
- text-brand-muted     → Mid-tone indigo (secondary text)
- text-brand-accent    → Royal purple (emphasized text, links)

BORDERS:
- border-brand-surface → Lavender borders (subtle)
- border-brand-muted   → Indigo borders (stronger)
- border-brand-accent  → Purple borders (emphasized)

RINGS (Focus states):
- ring-brand-accent    → Purple focus rings
- ring-offset-brand-bg → White offset (default on light bg)
*/

/* ===== COMPONENT EXAMPLES ===== */

/*
PRIMARY BUTTON:
- bg-brand-accent text-white
- hover:bg-brand-text hover:text-white
- transition-all duration-300

SECONDARY BUTTON:
- border-2 border-brand-accent text-brand-accent
- hover:bg-brand-accent hover:text-white

CARD:
- bg-brand-surface text-brand-text
- p-6 md:p-8

SECTION LABEL:
- text-xs uppercase tracking-widest font-medium text-brand-muted
- flex items-center gap-2

HEADINGS:
- heading-primary: font-display font-bold text-brand-text text-5xl md:text-6xl lg:text-7xl
- heading-secondary: font-display font-semibold text-brand-text text-2xl md:text-3xl lg:text-4xl
*/

/* ===== MOTION PATTERNS (Framer Motion) ===== */

/*
FADE IN (Opacity only):
- hidden: { opacity: 0 }
- visible: { opacity: 1, transition: { duration: 0.4 } }

FADE IN WITH SLIDE (Gentle Y-axis):
- hidden: { opacity: 0, y: 20 }
- visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }

STAGGER CHILDREN (Sequential fade):
- containerVariants:
    - hidden: { opacity: 0 }
    - visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
      }
- itemVariants:
    - hidden: { opacity: 0, y: 12 }
    - visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }

HOVER STATE (Subtle lift):
- whileHover: { y: -4 }
- transition: { duration: 0.3, ease: 'easeOut' }

BUTTON PRESS (Subtle scale):
- whileTap: { scale: 0.98 }
- whileHover: { scale: 1.02 }
- transition: { duration: 0.2 }

COLOR TRANSITION (Smooth hover):
- animate: { color: isHovered ? 'hsl(265, 28%, 55%)' : 'hsl(246, 47%, 15%)' }
- transition: { duration: 0.2 }
*/

/* ===== LAYOUT PRINCIPLES ===== */

/*
SWISS GRID STRUCTURE:
- Base: 3-column desktop grid (md:grid-cols-3)
- Mobile: 1-column grid (grid-cols-1)
- Gaps: Generous spacing (gap-12 lg:gap-20)

ASYMMETRICAL LAYOUTS:
- Content: 2 columns (lg:col-span-2)
- Visual: 1 column (lg:col-span-1)
- Featured items: 2x2 (lg:col-span-2 lg:row-span-2)

NEGATIVE SPACE:
- Section padding: px-8 md:px-16 lg:px-24 py-24 md:py-32 lg:py-40
- Component margins: space-y-8, space-y-6, gap-8, gap-12
- Never remove whitespace for visual density

DEPTH THROUGH CONTRAST:
- brand-bg (white) + brand-surface (lavender) = main depth
- Geometric accents (small squares) = focal points
- Layout shifts (y: -4px) = subtle elevation
- No shadows, no gradients, no glassmorphism
*/

/* ===== SPACING SCALE ===== */

/*
Consistent spacing based on Tailwind defaults:
- xs: px-4 py-2
- sm: px-6 py-3
- md: px-8 py-4
- lg: px-8 md:px-16 lg:px-24
- xl: py-24 md:py-32 lg:py-40

For components:
- Cards: p-6 md:p-8
- Sections: py-24 md:py-32 lg:py-40
- Containers: px-8 md:px-16 lg:px-24 max-w-7xl
*/

/* ===== TYPOGRAPHY ===== */

/*
Font Family:
- Display: 'Space Grotesk' (headlines, bold)
- Body: 'DM Sans' (body text, default)

Weight Scale:
- Light: 300 (rare)
- Normal: 400 (body)
- Medium: 500 (labels, metadata)
- Semibold: 600 (subheadings)
- Bold: 700 (headings)

Size Scale (responsive):
- xs: text-xs (labels, metadata)
- sm: text-sm (secondary text)
- base: text-base (body text)
- lg: text-lg (body emphasis)
- xl: text-xl (small headings)
- 2xl: text-2xl (subheadings)
- 3xl+: Headlines with leading-[0.9] tracking-tight
*/

export const ColorPalette = {
  light: {
    bg: '#FFFFFF',
    surface: '#E8E4F5',
    text: '#141738',
    muted: '#3E458D',
    accent: '#7B6AB5',
  },
  darkMode: {
    bg: '#141738',
    surface: '#3E458D',
    text: '#FFFFFF',
    muted: '#E8E4F5',
    accent: '#7B6AB5',
  },
};
