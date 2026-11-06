import type {BoxSlug} from '~/lib/boxes';

interface BoxIllustrationProps {
  craft: BoxSlug;
}

const LABELS: Record<BoxSlug, string> = {
  crochet: 'Illustration : pelote de laine et fil en spirale',
  couture: 'Illustration : aiguille et point de couture',
  peinture: 'Illustration : pinceau et gouttes de peinture',
};

export function BoxIllustration({craft}: BoxIllustrationProps) {
  return (
    <span
      aria-label={LABELS[craft]}
      className={`box-illustration box-illustration--${craft}`}
      role="img"
    >
      <svg
        aria-hidden="true"
        className="box-illustration-svg"
        focusable="false"
        viewBox="0 0 120 120"
      >
        {craft === 'crochet' ? <CrochetMotif /> : null}
        {craft === 'couture' ? <CoutureMotif /> : null}
        {craft === 'peinture' ? <PeintureMotif /> : null}
      </svg>
    </span>
  );
}

function CrochetMotif() {
  return (
    <g>
      <circle
        cx="60"
        cy="62"
        fill="none"
        opacity="0.35"
        r="30"
        stroke="var(--color-yellow)"
        strokeWidth="2"
      />
      <g
        className="box-illustration-yarn"
        fill="none"
        stroke="var(--color-brown)"
        strokeLinecap="round"
        strokeWidth="3"
      >
        <path d="M38 62 Q46 40 60 44 Q76 48 72 66 Q68 82 50 76 Q36 71 42 58" />
        <path d="M72 66 Q86 70 90 86" stroke="var(--color-pink)" strokeWidth="2.5" />
      </g>
      <circle cx="90" cy="86" fill="var(--color-pink)" r="3" stroke="none" />
    </g>
  );
}

function CoutureMotif() {
  return (
    <g fill="none" strokeLinecap="round">
      <path
        className="box-illustration-seam"
        d="M24 86 Q48 50 72 58 T108 36"
        stroke="var(--color-green)"
        strokeDasharray="7 8"
        strokeWidth="3"
      />
      <path d="M94 28 L112 20" stroke="var(--color-brown)" strokeWidth="3" />
      <circle cx="112" cy="20" r="3" stroke="var(--color-brown)" strokeWidth="2" />
      <path
        d="M40 78 L46 86 M46 78 L40 86"
        stroke="var(--color-pink)"
        strokeWidth="2"
      />
      <path
        d="M64 58 L70 66 M70 58 L64 66"
        stroke="var(--color-pink)"
        strokeWidth="2"
      />
    </g>
  );
}

function PeintureMotif() {
  return (
    <g>
      <g className="box-illustration-brush">
        <rect
          fill="var(--color-brown)"
          height="38"
          rx="3"
          transform="rotate(18 57 37)"
          width="10"
          x="52"
          y="18"
        />
        <path
          d="M46 52 L68 52 L60 72 L54 72 Z"
          fill="var(--color-blue)"
          transform="rotate(18 57 37)"
        />
      </g>
      <circle cx="42" cy="92" fill="var(--color-yellow)" opacity="0.85" r="6" />
      <circle cx="62" cy="98" fill="var(--color-pink)" opacity="0.85" r="5" />
      <circle cx="80" cy="90" fill="var(--color-green)" opacity="0.85" r="4.5" />
    </g>
  );
}
