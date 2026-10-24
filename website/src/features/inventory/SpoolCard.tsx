import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Spool } from '../../api/types';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Text } from '../../components/Text';
import { humanizeEnum } from '../../utils/format';
import { formatWeight, type WeightUnit } from '../../utils/units';
import styles from './SpoolCard.module.css';

export interface SpoolCardProps {
  spool: Spool;
  lowStockThresholdG: number;
  weightUnit?: WeightUnit;
}

/** A spool summary that links to its detail page. */
export function SpoolCard({ spool, lowStockThresholdG, weightUnit = 'g' }: SpoolCardProps) {
  const pct = Math.round((spool.remainingWeightG / spool.netWeightG) * 100);
  const isLow = spool.remainingWeightG < lowStockThresholdG;
  const finish = spool.tags[0] ? humanizeEnum(spool.tags[0]) : undefined;
  const printTemp =
    spool.minNozzleTempC && spool.maxNozzleTempC
      ? `${spool.minNozzleTempC}–${spool.maxNozzleTempC}°C`
      : undefined;
  // The filament color is data, so it reaches CSS as a custom property.
  const swatchStyle = { '--swatch': spool.colorHex ?? 'var(--color-chip)' } as CSSProperties;

  return (
    <Card
      as={Link}
      to={`/inventory/${spool.id}`}
      interactive
      padding="none"
      className={styles.card}
      // The card holds a lot of text; name the link by what it opens.
      aria-label={`${spool.materialName}, ${spool.brand}${isLow ? ', low stock' : ''}`}
    >
      <div className={styles.top}>
        <div className={styles.swatch} style={swatchStyle} />
        <div className={styles.identity}>
          <div className={styles.name}>{spool.materialName}</div>
          <Text variant="meta" as="div" className={styles.brand}>
            {spool.brand}
          </Text>
        </div>
        <div className={styles.badges}>
          <Badge size="sm">{spool.materialType}</Badge>
          {isLow && (
            <Badge size="sm" tone="warning">
              Low
            </Badge>
          )}
        </div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          <span>Remaining</span>
          <span className={styles.progressValue}>
            {formatWeight(spool.remainingWeightG, weightUnit)} · {pct}%
          </span>
        </div>
        <ProgressBar
          label="Filament remaining"
          value={spool.remainingWeightG}
          max={spool.netWeightG}
          tone={isLow ? 'warning' : 'brand'}
        />
      </div>

      <dl className={styles.specs}>
        {finish && <Spec label="Finish" value={finish} />}
        <Spec label="Net" value={formatWeight(spool.netWeightG, weightUnit)} />
        <Spec label="Ø" value={`${spool.filamentDiameterMm} mm`} />
        {printTemp && <Spec label="Print temp" value={printTemp} />}
      </dl>
    </Card>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text variant="label" as="dt">
        {label}
      </Text>
      <dd className={styles.specValue}>{value}</dd>
    </div>
  );
}
