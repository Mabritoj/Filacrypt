import type { CSSProperties, ReactNode } from 'react';
import type { MaterialTag, MaterialType } from '../../api/types';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Chip } from '../../components/Chip';
import { Select } from '../../components/Select';
import { Text } from '../../components/Text';
import styles from './FilterPanel.module.css';
import { humanizeEnum } from '../../utils/format';

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
        <Text variant="title" as="h2">
          Filters
        </Text>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {availableMaterialTypes.length > 0 && (
        <Section label="Material type">
          <div className={styles.chips}>
            {availableMaterialTypes.map((materialType) => (
              <Chip
                key={materialType}
                pressed={materialTypes.includes(materialType)}
                onClick={() => onToggleMaterialType(materialType)}
              >
                {materialType}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {availableTags.length > 0 && (
        <Section label="Finish">
          <div className={styles.chips}>
            {availableTags.map((tag) => (
              <Chip key={tag} pressed={tags.includes(tag)} onClick={() => onToggleTag(tag)}>
                {humanizeEnum(tag)}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {availableColors.length > 0 && (
        <Section label="Color">
          <div className={styles.swatches}>
            {availableColors.map((hex) => (
              <button
                key={hex}
                type="button"
                className={styles.swatch}
                aria-pressed={colors.includes(hex)}
                // The filament color is data, so it reaches CSS as a custom property.
                style={{ '--swatch': hex } as CSSProperties}
                aria-label={`Filter by color ${hex}`}
                onClick={() => onToggleColor(hex)}
              />
            ))}
          </div>
        </Section>
      )}

      {availableBrands.length > 0 && (
        <Section label="Brand">
          <Select
            size="sm"
            aria-label="Brand"
            value={brand ?? ''}
            onChange={(event) => onSetBrand(event.target.value || null)}
          >
            <option value="">All brands</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </Section>
      )}

      <Checkbox className={styles.lowStock} checked={lowStockOnly} onChange={onToggleLowStockOnly}>
        Only show low stock
      </Checkbox>

      <div className={styles.actions}>
        <Button variant="secondary" className={styles.reset} onClick={onReset}>
          Reset
        </Button>
        <Button className={styles.apply} onClick={onClose}>
          Apply filters
        </Button>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <Text variant="label" as="div" className={styles.sectionLabel}>
        {label}
      </Text>
      {children}
    </div>
  );
}
