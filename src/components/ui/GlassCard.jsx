import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * GlassCard — Modular glassmorphism with functional depth layers.
 *
 * Level 1 (background)  — ambient cards, section backgrounds
 * Level 2 (container)   — main content panels, lists
 * Level 3 (overlay)     — floating cards, dropdowns, tooltips
 * Level 4 (modal/action)— dialogs, action sheets, modals
 *
 * Depth = importance: higher level = closer to user = more opaque + more blur.
 */

const levels = {
  1: "glass-1",
  2: "glass-2",
  3: "glass-3",
  4: "glass-4",
};

export default function GlassCard({ children, level = 1, className, hover = false, ...props }) {
  const Component = hover ? motion.div : "div";
  const hoverProps = hover
    ? {
        whileHover: { y: -2, scale: 1.005 },
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }
    : {};

  return (
    <Component
      className={cn(levels[level], "rounded-2xl", className)}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  );
}