"use client";

import { useRef } from "react";

type SpotlightCardProps = {
  children: React.ReactNode;
  className?: string;
  /** accent color of the cursor-following glow */
  spotlightColor?: string;
};

/**
 * ReactBits SpotlightCard — a card that reveals a soft radial glow that
 * follows the cursor (touching children). Copied verbatim from
 * reactbits (MIT) and adapted to the Teadrop glass design tokens.
 */
export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(52, 211, 153, 0.10)",
}: SpotlightCardProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = divRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    el.style.setProperty("--mouse-x", `${x}px`);
    el.style.setProperty("--mouse-y", `${y}px`);
    el.style.setProperty("--spotlight-color", spotlightColor);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`card-spotlight ${className}`}
    >
      {children}
    </div>
  );
}
