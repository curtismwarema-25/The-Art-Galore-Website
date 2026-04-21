import { motion } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Light Mode Layout Component
 * 
 * Design System - Lavender & Midnight Palette (Light Mode):
 * - brand-bg: #FFFFFF (Pure white - primary clean background)
 * - brand-surface: #E8E4F5 (Soft lavender - cards, secondary sections)
 * - brand-text: #141738 (Deep midnight - primary typography)
 * - brand-muted: #3E458D (Mid-tone indigo - secondary text, metadata)
 * - brand-accent: #7B6AB5 (Royal purple - buttons, active states)
 * 
 * Design Directives:
 * ✓ Editorial minimalism with Swiss grid structures
 * ✓ Asymmetrical layouts with generous negative space (#FFFFFF)
 * ✓ Flat, solid color blocks only - NO shadows, glassmorphism, or gradients
 * ✓ Depth achieved through layout contrast and color blocks
 * ✓ Subtle Framer Motion: gentle opacity fades, typographic shifts
 */

export function LightModeLayout() {
  return (
    <div className="bg-brand-bg text-brand-text min-h-screen">
      {/* Header Navigation */}
      <header className="border-b border-brand-surface">
        <nav className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-6 flex items-center justify-between">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-bold font-display text-brand-text"
          >
            Kisii Art
          </motion.h1>

          {/* Navigation Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex gap-8"
          >
            {['Gallery', 'Artists', 'Events'].map((item) => (
              <button
                key={item}
                className="
                  text-sm font-medium text-brand-text
                  hover:text-brand-accent
                  transition-colors duration-200
                  pb-1 border-b-2 border-transparent
                  hover:border-brand-accent
                "
              >
                {item}
              </button>
            ))}
          </motion.div>
        </nav>
      </header>

      {/* Hero Section - Asymmetrical Grid */}
      <section className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20 items-start">
          {/* Content - 2 columns */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Section Label */}
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand-accent" />
              <span className="text-xs uppercase tracking-widest font-medium text-brand-muted">
                Emerging Voices
              </span>
            </div>

            {/* Main Headline */}
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-[0.9] tracking-tight text-brand-text">
              Where Contemporary
              <br />
              Art Lives
            </h2>

            {/* Description */}
            <p className="text-lg text-brand-muted max-w-md leading-relaxed">
              Discover a curated collective of emerging and established artists. Each work tells a story of innovation and cultural expression.
            </p>

            {/* CTA Button - Flat solid with subtle hover */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="
                px-8 py-4 
                bg-brand-accent text-white
                font-semibold tracking-wide uppercase text-sm
                transition-all duration-300
                hover:bg-brand-text
                focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2
              "
            >
              Explore Gallery
            </motion.button>
          </motion.div>

          {/* Visual Blocks - 1 column, asymmetrical placement */}
          <motion.div
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {/* Large accent block */}
            <motion.div
              className="bg-brand-surface aspect-square"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            />

            {/* Grid of smaller blocks */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                className="bg-brand-accent h-24"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              />
              <motion.div
                className="bg-brand-surface h-24 border-2 border-brand-muted"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="bg-brand-surface py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24">
          {/* Section Header */}
          <motion.div
            className="mb-16 md:mb-24 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-brand-accent" />
              <span className="text-xs uppercase tracking-widest font-medium text-brand-muted">
                Features
              </span>
            </div>
            <h3 className="text-4xl md:text-5xl font-bold font-display text-brand-text">
              Why Join Us
            </h3>
          </motion.div>

          {/* Feature Cards Grid - Swiss grid 3 column */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: 'Curated Selection',
                description: 'Hand-picked artists and works that push boundaries and inspire.',
              },
              {
                title: 'Direct Connection',
                description: 'Connect directly with creators. Support their vision, own their art.',
              },
              {
                title: 'Community Events',
                description: 'Exclusive exhibitions, talks, and gatherings throughout the year.',
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                className="bg-brand-bg p-8 space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                whileHover={{ y: -4 }}
              >
                {/* Geometric accent */}
                <div className="flex items-center gap-3 pb-4 border-b border-brand-surface">
                  <div className="w-2 h-2 bg-brand-accent" />
                  <h4 className="text-lg font-semibold font-display text-brand-text">
                    {feature.title}
                  </h4>
                </div>
                <p className="text-brand-muted leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-brand-bg py-24 md:py-32 border-t border-brand-surface">
        <div className="max-w-4xl mx-auto px-8 md:px-16 lg:px-24 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-5xl font-bold font-display text-brand-text">
              Ready to Explore?
            </h2>
            <p className="text-lg text-brand-muted">
              Join our community of art enthusiasts and creators.
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <button
              className="
                px-8 py-4 
                bg-brand-accent text-white
                font-semibold tracking-wide uppercase text-sm
                transition-all duration-300
                hover:bg-brand-text
              "
            >
              Get Started
            </button>
            <button
              className="
                px-8 py-4 
                bg-transparent border-2 border-brand-accent text-brand-accent
                font-semibold tracking-wide uppercase text-sm
                transition-all duration-300
                hover:bg-brand-accent hover:text-white
              "
            >
              Learn More
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
