interface BeeMascotProps {
  transform: string;
}

/** Shared bee mascot motif, reused across the dream-section step icons
 * and the box illustrations so it is drawn once, consistently. */
export function BeeMascot({transform}: BeeMascotProps) {
  return (
    <g transform={transform}>
      <ellipse
        cx="-2"
        cy="-7"
        fill="var(--color-white)"
        rx="3.6"
        ry="5.2"
        transform="rotate(-25 -2 -7)"
      />
      <ellipse
        cx="3"
        cy="-7"
        fill="var(--color-white)"
        rx="3.6"
        ry="5.2"
        transform="rotate(25 3 -7)"
      />
      <ellipse cx="0" cy="0" fill="var(--color-dream-blush)" rx="7" ry="5" />
      <path d="M-2 -4.6v9.2M2 -4.6v9.2" />
      <path d="M7 0h2.5" />
      <circle cx="-4.5" cy="-1" fill="var(--color-green)" r=".6" />
    </g>
  );
}
