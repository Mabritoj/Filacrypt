import { useId } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { formatLength, formatWeight, type LengthUnit, type WeightUnit } from '../../utils/units';
import styles from './SpoolVisualization.module.css';

export interface SpoolVisualizationProps {
  colorHex: string;
  remainingWeightG: number;
  netWeightG: number;
  totalLengthMm?: number;
  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;
}

const METAL_TONES = {
  dark: { flangeFrom: '#322e27', flangeTo: '#181510', hub: '#241f19', spindle: '#17130d' },
  light: { flangeFrom: '#e6e0d5', flangeTo: '#cbc3b6', hub: '#e2dccf', spindle: '#cfc7b8' },
};

export function SpoolVisualization({
  colorHex,
  remainingWeightG,
  netWeightG,
  totalLengthMm,
  weightUnit = 'g',
  lengthUnit = 'm',
}: SpoolVisualizationProps) {
  const theme = useThemeStore((state) => state.theme);
  const gradientId = useId();
  const tones = METAL_TONES[theme];

  const pct = netWeightG > 0 ? Math.round((remainingWeightG / netWeightG) * 100) : 0;
  const rIn = 40;
  const rOutMax = 88;
  const currentOuter = rIn + ((rOutMax - rIn) * pct) / 100;
  const bandWidth = Math.max(0.001, currentOuter - rIn);
  const bandMid = (rIn + currentOuter) / 2;
  const remainingLengthMm =
    totalLengthMm && netWeightG > 0 ? (remainingWeightG / netWeightG) * totalLengthMm : undefined;

  return (
    <div className={styles.card}>
      <svg width={230} height={230} viewBox="0 0 230 230" aria-hidden="true">
        <defs>
          <radialGradient id={gradientId} cx="42%" cy="36%" r="78%">
            <stop offset="0%" stopColor={tones.flangeFrom} />
            <stop offset="100%" stopColor={tones.flangeTo} />
          </radialGradient>
        </defs>
        <circle
          cx={115}
          cy={115}
          r={104}
          fill={`url(#${gradientId})`}
          stroke="rgba(0,0,0,.1)"
          strokeWidth={2}
        />
        <circle cx={115} cy={115} r={95} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth={1.5} />
        <circle cx={115} cy={115} r={64} fill="none" stroke={tones.hub} strokeWidth={48} />
        <circle
          cx={115}
          cy={115}
          r={bandMid}
          fill="none"
          stroke={colorHex}
          strokeWidth={bandWidth}
        />
        <g stroke="rgba(0,0,0,.3)" strokeWidth={1} fill="none">
          <circle cx={115} cy={115} r={46} />
          <circle cx={115} cy={115} r={54} />
          <circle cx={115} cy={115} r={62} />
          <circle cx={115} cy={115} r={70} />
          <circle cx={115} cy={115} r={78} />
          <circle cx={115} cy={115} r={86} />
        </g>
        <circle
          cx={115}
          cy={115}
          r={currentOuter}
          fill="none"
          stroke="rgba(255,255,255,.4)"
          strokeWidth={1.5}
        />
        <circle
          cx={115}
          cy={115}
          r={40}
          fill={tones.hub}
          stroke="rgba(0,0,0,.12)"
          strokeWidth={2}
        />
        <g fill={tones.spindle}>
          <circle cx={115} cy={88} r={4.5} />
          <circle cx={138.5} cy={128.5} r={4.5} />
          <circle cx={91.5} cy={128.5} r={4.5} />
        </g>
        <circle
          cx={115}
          cy={115}
          r={16}
          fill="var(--color-surface)"
          stroke="rgba(0,0,0,.09)"
          strokeWidth={1.5}
        />
      </svg>

      <div className={styles.pctRow}>
        <span className={styles.pctValue}>{pct}%</span>
        <span className={styles.pctLabel}>REMAINING</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{formatWeight(remainingWeightG, weightUnit)}</div>
          <div className={styles.statLabel}>WEIGHT</div>
        </div>
        {remainingLengthMm !== undefined && (
          <div className={`${styles.stat} ${styles.statBordered}`}>
            <div className={styles.statValue}>{formatLength(remainingLengthMm, lengthUnit)}</div>
            <div className={styles.statLabel}>LENGTH</div>
          </div>
        )}
      </div>
    </div>
  );
}
