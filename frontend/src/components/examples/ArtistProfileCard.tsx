import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Minimalist Artist Profile Card
 * 
 * Design Principles:
 * - Swiss grid-based layout with precise alignment
 * - Flat solid color blocks (brand-surface, brand-accent, brand-muted)
 * - No glassmorphism or gradients
 * - Elegant opacity fades and subtle layout shifts
 * - High contrast typography (brand-text on brand-bg)
 */

interface ArtistProfileProps {
  name: string;
  role: string;
  image?: string;
  bio: string;
  featured?: boolean;
  onClick?: () => void;
}

export function ArtistProfileCard({
  name,
  role,
  image,
  bio,
  featured = false,
  onClick,
}: ArtistProfileProps) {
  const [isHovered, setIsHovered] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.article
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`
        cursor-pointer group
        ${featured ? 'lg:col-span-2 lg:row-span-2' : ''}
      `}
    >
      <div className="space-y-6">
        {/* Image Container - Flat solid block with hover effect */}
        <motion.div
          className={`
            bg-brand-surface overflow-hidden
            ${featured ? 'aspect-square' : 'aspect-video'}
          `}
          animate={{ scale: isHovered ? 1.02 : 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 bg-brand-accent opacity-20" />
            </div>
          )}
        </motion.div>

        {/* Content Grid - Aligned to 4-column structure */}
        <div className="space-y-4 px-2">
          {/* Artist Name */}
          <motion.h3
            animate={{ color: isHovered ? 'hsl(265, 28%, 55%)' : 'hsl(0, 0%, 100%)' }}
            transition={{ duration: 0.2 }}
            className="
              text-xl md:text-2xl font-bold font-display leading-tight
              tracking-tight
            "
          >
            {name}
          </motion.h3>

          {/* Role / Category */}
          <motion.p
            className="
              text-sm uppercase tracking-widest font-medium
              text-brand-muted
            "
          >
            {role}
          </motion.p>

          {/* Bio Text */}
          <motion.p
            animate={{ opacity: isHovered ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
            className="
              text-sm leading-relaxed
              text-brand-muted max-h-20 overflow-hidden
            "
          >
            {bio}
          </motion.p>

          {/* Interactive Element - Geometric accent */}
          <motion.div
            className="pt-2 flex items-center gap-2"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="w-1.5 h-1.5 bg-brand-accent" />
            <span className="text-xs font-medium uppercase tracking-wide text-brand-accent">
              View Profile
            </span>
          </motion.div>
        </div>

        {/* Optional Bottom Accent Bar */}
        {featured && (
          <motion.div
            className="h-1 bg-brand-accent w-12"
            animate={{ width: isHovered ? '2rem' : '3rem' }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
    </motion.article>
  );
}

/**
 * Artist Grid Container
 * Demonstrates Swiss grid structure with asymmetrical layout
 */
export function ArtistGrid({ artists }: { artists: ArtistProfileProps[] }) {
  return (
    <section className="bg-brand-bg text-brand-text py-24 md:py-32 lg:py-40">
      <div className="container-narrow px-8 md:px-16 lg:px-24">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16 md:mb-24 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-brand-accent" />
            <span className="text-sm uppercase tracking-widest text-brand-muted font-medium">
              Our Collective
            </span>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold font-display">
            Featured Artists
          </h2>
        </motion.div>

        {/* Swiss Grid Layout - 3 column base with featured items breaking rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {artists.map((artist, idx) => (
            <ArtistProfileCard
              key={idx}
              {...artist}
              featured={idx === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
