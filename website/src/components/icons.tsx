import type { ReactNode, SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Width and height in px. */
  size?: number;
  /**
   * Accessible name. Icons are decorative (hidden from assistive tech) unless
   * given one -- inside a labelled control, leave it off.
   */
  title?: string;
}

/** Shared 24x24 frame. Every icon draws with currentColor, so color via CSS `color`. */
function Icon({ size = 16, title, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** NFC waves -- tag reading and writing. */
export function NfcIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 8a10 10 0 0 1 0 8" {...stroke} />
      <path d="M9 5a15 15 0 0 1 0 14" {...stroke} />
      <path d="M13 3a20 20 0 0 1 0 18" {...stroke} />
      <circle cx={19} cy={12} r={1.5} fill="currentColor" />
    </Icon>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={2} />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        {...stroke}
        strokeWidth={1.5}
      />
    </Icon>
  );
}

/** Two opposing arrows -- switch between things. */
export function SwapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7h11l-3-3" {...stroke} />
      <path d="M17 17H6l3 3" {...stroke} />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 18l-6-6 6-6" {...stroke} />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6L6 18M6 6l12 12" {...stroke} />
    </Icon>
  );
}

/** Vertical ellipsis -- overflow / options menu. */
export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx={12} cy={5} r={1.75} fill="currentColor" />
      <circle cx={12} cy={12} r={1.75} fill="currentColor" />
      <circle cx={12} cy={19} r={1.75} fill="currentColor" />
    </Icon>
  );
}

/**
 * Top-down filament spool: dashed winding rings around a hub. Doubles as the
 * app's loading indicator -- add `spoolSpin.module.css`'s `spin` class to
 * rotate it. The outer flange stays a neutral border color; the windings
 * follow currentColor.
 */
export function SpoolIcon(props: IconProps) {
  const ring = { stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' } as const;
  return (
    <Icon {...props}>
      <circle cx={12} cy={12} r={10} stroke="var(--color-border-strong)" strokeWidth={1} />
      <circle cx={12} cy={12} r={8.5} {...ring} strokeOpacity={0.9} strokeDasharray="3 2" />
      <circle
        cx={12}
        cy={12}
        r={7}
        {...ring}
        strokeOpacity={0.7}
        strokeDasharray="3 2"
        strokeDashoffset={1.5}
      />
      <circle
        cx={12}
        cy={12}
        r={5.5}
        {...ring}
        strokeOpacity={0.5}
        strokeDasharray="2.5 2"
        strokeDashoffset={0.8}
      />
      <circle
        cx={12}
        cy={12}
        r={4}
        {...ring}
        strokeOpacity={0.35}
        strokeDasharray="2 1.5"
        strokeDashoffset={1.2}
      />
      <circle cx={12} cy={12} r={2} fill="currentColor" />
    </Icon>
  );
}
