import {useId} from 'react';
import {BeeMascot} from '~/components/BeeMascot';
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
      {craft === 'crochet' ? <CrochetIcon /> : null}
      {craft === 'couture' ? <CoutureIcon /> : null}
      {craft === 'peinture' ? <PeintureIcon /> : null}
    </span>
  );
}

function CrochetIcon() {
  const yarnClipId = useId();
  const yarnInnerClipId = useId();

  return (
    <svg
      aria-hidden="true"
      className="box-illustration-svg"
      fill="none"
      focusable="false"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 64 64"
    >
      <defs>
        <clipPath id={yarnClipId}>
          <circle cx="24" cy="40" r="14" />
        </clipPath>
        <clipPath id={yarnInnerClipId}>
          <circle cx="36" cy="52" r="8.4" />
        </clipPath>
      </defs>
      <path
        d="M36 33 C44 29 47 22 41 19 C35 16 36 9 44 8.5 C50 8 54 10 55.5 13"
        stroke="var(--color-dream-accent)"
        strokeDasharray="1 4"
      />
      <circle cx="24" cy="40" fill="var(--color-dream-blush)" r="14" />
      <g clipPath={`url(#${yarnClipId})`} stroke="var(--color-white)">
        <g>
          <circle cx="6" cy="60" r="24" />
          <circle cx="6" cy="60" r="28" />
          <circle cx="6" cy="60" r="32" />
          <circle cx="6" cy="60" r="36" />
        </g>
        <circle cx="36" cy="52" fill="var(--color-dream-blush)" r="23.5" stroke="none" />
        <g>
          <circle cx="36" cy="52" r="12" />
          <circle cx="36" cy="52" r="16" />
          <circle cx="36" cy="52" r="20" />
        </g>
        <circle cx="36" cy="52" fill="var(--color-dream-blush)" r="9.5" stroke="none" />
        <g clipPath={`url(#${yarnInnerClipId})`}>
          <circle cx="54" cy="42" r="15" />
          <circle cx="54" cy="42" r="19" />
          <circle cx="54" cy="42" r="23" />
        </g>
      </g>
      <circle cx="24" cy="40" r="14" />
      <path d="M44 56 L56 14" />
      <path d="M56 14 c1.5-3.5-3.5-4.5-4-1.5" />
      <BeeMascot transform="translate(12 16) rotate(-10) scale(-1 1)" />
    </svg>
  );
}

function CoutureIcon() {
  return (
    <svg
      aria-hidden="true"
      className="box-illustration-svg"
      fill="none"
      focusable="false"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 64 64"
    >
      <path
        d="M28 36 C40 28 34 52 46 44 S54 30 56 21"
        stroke="var(--color-dream-accent)"
        strokeDasharray="1 4"
      />
      <rect fill="var(--color-dream-blush)" height="26" rx="2" width="18" x="10" y="26" />
      <path d="M10 33h18M10 39h18M10 45h18" stroke="var(--color-dream-accent)" />
      <rect fill="var(--color-white)" height="5" rx="2" width="24" x="7" y="21" />
      <rect fill="var(--color-white)" height="5" rx="2" width="24" x="7" y="52" />
      <path d="M44 54 L57 18" />
      <ellipse cx="56" cy="21" rx="1.4" ry="3" transform="rotate(20 56 21)" />
      <BeeMascot transform="translate(40 14) rotate(-10) scale(-1 1)" />
    </svg>
  );
}

function PeintureIcon() {
  return (
    <svg
      aria-hidden="true"
      className="box-illustration-svg"
      fill="none"
      focusable="false"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 64 64"
    >
      <path
        d="M23 34 C17 24 30 22 24 15 C20 9 28 6 31 13"
        stroke="var(--color-dream-accent)"
        strokeDasharray="1 4"
      />
      <path d="M36 36 L33.5 46M52 36 L54.5 46M44 36 V44" />
      <rect fill="var(--color-white)" height="28" rx="2" width="28" x="30" y="8" />
      <rect
        height="20"
        rx="1"
        stroke="var(--color-dream-blush)"
        strokeWidth="1.5"
        width="20"
        x="34"
        y="12"
      />
      <BeeMascot transform="translate(44 25) rotate(-10) scale(-0.65 0.65)" />
      <g strokeWidth="3.1" transform="translate(18 42) rotate(35) scale(0.7)">
        <path
          d="M-2.5 0 C-3.5 -5 -1.5 -9 0 -12 C1.5 -9 3.5 -5 2.5 0z"
          fill="var(--color-dream-accent)"
          stroke="var(--color-dream-accent)"
        />
        <rect fill="var(--color-dream-blush)" height="6" rx="1" width="6" x="-3" y="0" />
        <path d="M-2 6 L-1.2 22 a1.2 1.2 0 0 0 2.4 0 L2 6z" fill="var(--color-white)" />
      </g>
    </svg>
  );
}
