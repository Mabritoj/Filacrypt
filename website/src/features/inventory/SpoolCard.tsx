import type { Spool } from '../../api/types';
import { formatWeight, type WeightUnit } from '../../utils/units';
import styles from './SpoolCard.module.css';

export interface SpoolCardProps {
  spool: Spool;
  lowStockThresholdG: number;
  weightUnit?: WeightUnit;
  onClick: () => void;
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function SpoolCard({
  spool,
  lowStockThresholdG,
  weightUnit = 'g',
  onClick,
}: SpoolCardProps) {
  const pct = Math.round((spool.remainingWeightG / spool.netWeightG) * 100);
  const isLow = spool.remainingWeightG < lowStockThresholdG;
  const finish = spool.tags[0] ? formatTag(spool.tags[0]) : undefined;
  const printTemp =
    spool.minNozzleTempC && spool.maxNozzleTempC
      ? `${spool.minNozzleTempC}–${spool.maxNozzleTempC}°C`
      : undefined;

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.top}>
        <div className={styles.swatch} style={{ background: spool.colorHex ?? '#888' }} />
        <div className={styles.identity}>
          <div className={styles.name}>{spool.materialName}</div>
          <div className={styles.brand}>{spool.brand}</div>
        </div>
        <div className={styles.badges}>
          <span className={styles.materialBadge}>{spool.materialType}</span>
          {isLow && <span className={styles.lowBadge}>LOW</span>}
        </div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressLabel}>
          <span>Remaining</span>
          <span className={styles.progressValue}>
            {formatWeight(spool.remainingWeightG, weightUnit)} · {pct}%
          </span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={styles.specs}>
        {finish && (
          <div>
            <div className={styles.specLabel}>Finish</div>
            <div className={styles.specValue}>{finish}</div>
          </div>
        )}
        <div>
          <div className={styles.specLabel}>Net</div>
          <div className={styles.specValue}>{formatWeight(spool.netWeightG, weightUnit)}</div>
        </div>
        <div>
          <div className={styles.specLabel}>Ø</div>
          <div className={styles.specValue}>{spool.filamentDiameterMm} mm</div>
        </div>
        {printTemp && (
          <div>
            <div className={styles.specLabel}>Print temp</div>
            <div className={styles.specValue}>{printTemp}</div>
          </div>
        )}
      </div>
    </button>
  );
}
