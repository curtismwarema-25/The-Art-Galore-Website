import { motion } from 'framer-motion';

/**
 * Minimalist Hero Component
 * 
 * Design Principles:
 * - Editorial minimalism with asymmetrical layout
 * - Swiss grid structure (based on 4-8 column grids)
 * - Generous negative space
 * - Flat solid color blocks, no gradients
 * - Subtle Framer Motion transitions (opacity, layout shifts)
 */

export function HeroMinimal() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
      className="bg-brand-bg text-brand-text min-h-screen flex items-center"
    >
      <div className="container-narrow px-8 md:px-16 lg:px-24">
        {/* Asymmetrical Grid: 2-column on desktop, full on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-24 items-center">
          {/* Content Block - Takes 3 cols */}
          <motion.div className="lg:col-span-3 space-y-8" variants={containerVariants}>
            {/* Overline Label */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3"
            >
              <div className="w-2 h-2 bg-brand-accent" />
              <span className="text-sm font-medium tracking-widest uppercase text-brand-muted">
                Curated Excellence
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.9] tracking-tight font-display"
            >
              Where Art
              <br />
              Speaks
              <br />
              Louder
            </motion.h1>

            {/* Supporting Text */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-brand-muted max-w-md leading-relaxed"
            >
              Discover emerging artists and transformative contemporary works in our curated collective.
            </motion.p>

            {/* CTA Button - Solid color, no hover gradient */}
            <motion.div variants={itemVariants}>
              <button
                className="
                  px-8 py-4 
                  bg-brand-accent text-brand-text 
                  font-semibold tracking-wide uppercase text-sm
                  transition-all duration-300 ease-out
                  hover:bg-brand-surface hover:text-brand-text
                  active:scale-95
                "
              >
                Explore Collection
              </button>
            </motion.div>
          </motion.div>

          {/* Visual Block - Takes 2 cols, offset lower */}
          <motion.div
            className="lg:col-span-2 lg:row-start-1"
            variants={itemVariants}
          >
            {/* Geometric accent blocks demonstrating Swiss grid */}
            <div className="space-y-6">
              {/* Primary accent block */}
              <motion.div
                className="bg-brand-surface w-full h-64 md:h-80"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />

              {/* Secondary smaller blocks in grid */}
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  className="bg-brand-accent h-32"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className="bg-brand-muted h-32"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
