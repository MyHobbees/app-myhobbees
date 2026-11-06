import {BeeMascot} from '~/components/BeeMascot';

interface DreamStepIconProps {
  step: 1 | 2 | 3;
}

export function DreamStepIcon({step}: DreamStepIconProps) {
  if (step === 1) return <BeeHeartIcon />;
  if (step === 2) return <BeeGiftIcon />;
  return <BeeClockIcon />;
}

function BeeHeartIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="140"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 64 64"
      width="140"
    >
      <path
        d="M16 44 C8 30 20 14 26 24 S20 42 30 44 S36 22 32 34"
        stroke="var(--color-dream-accent)"
        strokeDasharray="1 4"
      />
      <path
        d="M46 52 C35 45 31 40 31 34.5 a7 7 0 0 1 15-3.2 a7 7 0 0 1 15 3.2 c0 5.5-4 10.5-15 17.5z"
        fill="var(--color-dream-accent)"
        stroke="var(--color-dream-accent)"
      />
      <BeeMascot transform="translate(10 48) rotate(-20) scale(-1 1)" />
    </svg>
  );
}

function BeeGiftIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="140"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      style={{overflow: 'visible'}}
      viewBox="0 0 64 64"
      width="140"
    >
      <g transform="rotate(-18 9 34)">
        <rect fill="var(--color-dream-blush)" height="8" rx="2" width="46" x="9" y="26" />
        <rect fill="var(--color-dream-accent)" height="8" stroke="none" width="6" x="29" y="26" />
        <rect fill="none" height="8" rx="2" width="46" x="9" y="26" />
        <path
          d="M32 26c-6-10-16-6-11 0z"
          fill="var(--color-dream-circle-2)"
          stroke="var(--color-dream-accent)"
        />
        <path
          d="M32 26c6-10 16-6 11 0z"
          fill="var(--color-dream-circle-2)"
          stroke="var(--color-dream-accent)"
        />
      </g>
      <BeeMascot transform="translate(49 29) rotate(-35) scale(-0.95 0.95)" />
      <rect fill="var(--color-dream-blush)" height="21" rx="2" width="40" x="12" y="34" />
      <rect fill="var(--color-dream-accent)" height="21" stroke="none" width="6" x="29" y="34" />
      <path d="M12 34h40v21H12z" fill="none" />
      <path d="M62 18l6-5M64 28h8M62 38l6 4" stroke="var(--color-dream-accent)" />
      <path d="M55 7l2-6" stroke="var(--color-dream-accent)" />
    </svg>
  );
}

function BeeClockIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="140"
      stroke="var(--color-green)"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 64 64"
      width="140"
    >
      <circle
        cx="32"
        cy="34"
        r="24"
        stroke="var(--color-dream-accent)"
        strokeDasharray="1 4"
      />
      <circle cx="32" cy="34" fill="var(--color-cream)" r="15" />
      <path d="M32 21v2M32 45v2M19 34h2M43 34h2" />
      <path d="M32 34V26M32 34l6 4" />
      <circle cx="32" cy="34" fill="var(--color-green)" r="1.5" />
      <BeeMascot transform="translate(49 17) rotate(45) scale(1)" />
    </svg>
  );
}
