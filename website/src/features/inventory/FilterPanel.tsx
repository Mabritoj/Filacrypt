import type { MaterialTag, MaterialType } from '../../api/types';
import styles from './FilterPanel.module.css';

export interface FilterPanelProps {
  availableMaterialTypes: MaterialType[];
  availableTags: MaterialTag[];
  availableColors: string[];
  availableBrands: string[];
  materialTypes: MaterialType[];
  tags: MaterialTag[];
  colors: string[];
  brand: string | null;
  lowStockOnly: boolean;
  onToggleMaterialType: (materialType: MaterialType) => void;
  onToggleTag: (tag: MaterialTag) => void;
  onToggleColor: (hex: string) => void;
  onSetBrand: (brand: string | null) => void;
  onToggleLowStockOnly: () => void;
  onReset: () => void;
  onClose: () => void;
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function FilterPanel({
  availableMaterialTypes,
  availableTags,
  availableColors,
  availableBrands,
  materialTypes,
  tags,
  colors,
  brand,
  lowStockOnly,
  onToggleMaterialType,
  onToggleTag,
  onToggleColor,
  onSetBrand,
  onToggleLowStockOnly,
  onReset,
  onClose,
}: FilterPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>Filters</span>
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </div>

      {availableMaterialTypes.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Material type</div>
          <div className={styles.chips}>
            {availableMaterialTypes.map((materialType) => (
              <button
                key={materialType}
                type="button"
                className={styles.chip}
                data-active={materialTypes.includes(materialType)}
                aria-pressed={materialTypes.includes(materialType)}
                onClick={() => onToggleMaterialType(materialType)}
              >
                {materialType}
              </button>
            ))}
          </div>
        </>
      )}

      {availableTags.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Finish</div>
          <div className={styles.chips}>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={styles.chip}
                data-active={tags.includes(tag)}
                aria-pressed={tags.includes(tag)}
                onClick={() => onToggleTag(tag)}
              >
                {formatTag(tag)}
              </button>
            ))}
          </div>
        </>
      )}

      {availableColors.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Color</div>
          <div className={styles.swatches}>
            {availableColors.map((hex) => (
              <button
                key={hex}
                type="button"
                className={styles.swatch}
                data-active={colors.includes(hex)}
                aria-pressed={colors.includes(hex)}
                style={{ background: hex }}
                aria-label={`Filter by color ${hex}`}
                onClick={() => onToggleColor(hex)}
              />
            ))}
          </div>
        </>
      )}

      {availableBrands.length > 0 && (
        <>
          <div className={styles.sectionLabel}>Brand</div>
          <select
            className={styles.brandSelect}
            value={brand ?? ''}
            onChange={(event) => onSetBrand(event.target.value || null)}
          >
            <option value="">All brands</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </>
      )}

      <label className={styles.checkboxRow}>
        <input type="checkbox" checked={lowStockOnly} onChange={onToggleLowStockOnly} />
        Only show low stock
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.reset} onClick={onReset}>
          Reset
        </button>
        <button type="button" className={styles.apply} onClick={onClose}>
          Apply filters
        </button>
      </div>
    </div>
  );
}
