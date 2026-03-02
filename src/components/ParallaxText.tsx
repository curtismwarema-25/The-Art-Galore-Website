import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ParallaxTextProps {
  children: string;
  className?: string;
  speed?: number;
}

export default function ParallaxText({ children, className = "", speed = 0.15 }: ParallaxTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -80 * speed]);

  return (
    <div ref={ref} className="overflow-hidden pointer-events-none select-none">
      <motion.div style={{ y }} className={className}>
        {children}
      </motion.div>
    </div>
  );
}
