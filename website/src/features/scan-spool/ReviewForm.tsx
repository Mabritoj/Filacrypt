import { useState } from 'react';
import { MATERIAL_TAGS, MATERIAL_TYPES } from '../../api/types';
import type { MaterialTag, MaterialType } from '../../api/types';
import { Button } from '../../components/Button';
import styles from './ReviewForm.module.css';

export interface ReviewFormValues {
  brand: string;
  materialName: string;
  materialType: MaterialType;
  finish: MaterialTag;
  colorHex: string;
  netWeightG: number;
  filamentDiameterMm: number;
  emptyContainerWeightG: number;
  minNozzleTempC: number;
  maxNozzleTempC: number;
  bedTempC: number;
  markFull: boolean;
}

export interface ReviewFormProps {
  initialValues: ReviewFormValues;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ReviewFormValues) => void;
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ReviewForm({ initialValues, isSubmitting, onCancel, onSubmit }: ReviewFormProps) {
  const [values, setValues] = useState<ReviewFormValues>(initialValues);

  function update<K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>Brand</span>
          <input
            className={styles.input}
            value={values.brand}
            onChange={(event) => update('brand', event.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Spool name</span>
          <input
            className={styles.input}
            value={values.materialName}
            onChange={(event) => update('materialName', event.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Color</span>
          <div className={styles.colorInputs}>
            <input
              type="color"
              aria-label="Color"
              className={styles.colorSwatchInput}
              value={values.colorHex}
              onChange={(event) => update('colorHex', event.target.value)}
            />
            <input
              type="text"
              aria-label="Color hex code"
              className={styles.input}
              value={values.colorHex}
              onChange={(event) => update('colorHex', event.target.value)}
            />
          </div>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Material</span>
          <select
            className={styles.input}
            value={values.materialType}
            onChange={(event) => update('materialType', event.target.value as MaterialType)}
          >
            {MATERIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Finish</span>
          <select
            className={styles.input}
            value={values.finish}
            onChange={(event) => update('finish', event.target.value as MaterialTag)}
          >
            {MATERIAL_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {formatTag(tag)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Net weight (g)</span>
          <input
            type="number"
            className={styles.input}
            value={values.netWeightG}
            min={0}
            // "any" rather than a round step: real tags report measured
            // weights (868 g on a Prusament spool), which a step of 10 would
            // reject as invalid and silently block the form from submitting.
            step="any"
            onChange={(event) => update('netWeightG', Number(event.target.value))}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Diameter (mm)</span>
          <input
            type="number"
            className={styles.input}
            value={values.filamentDiameterMm}
            min={0}
            step={0.05}
            onChange={(event) => update('filamentDiameterMm', Number(event.target.value))}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Empty spool weight (g)</span>
          <input
            type="number"
            className={styles.input}
            value={values.emptyContainerWeightG}
            min={0}
            // See net weight above -- a real tag reported 277 g, which a step
            // of 5 would reject.
            step="any"
            onChange={(event) => update('emptyContainerWeightG', Number(event.target.value))}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Nozzle temp (°C)</span>
          <div className={styles.rangeInputs}>
            <input
              type="number"
              className={styles.input}
              aria-label="Minimum nozzle temperature"
              value={values.minNozzleTempC}
              onChange={(event) => update('minNozzleTempC', Number(event.target.value))}
            />
            <span className={styles.rangeSep}>–</span>
            <input
              type="number"
              className={styles.input}
              aria-label="Maximum nozzle temperature"
              value={values.maxNozzleTempC}
              onChange={(event) => update('maxNozzleTempC', Number(event.target.value))}
            />
          </div>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Bed temp (°C)</span>
          <input
            type="number"
            className={styles.input}
            value={values.bedTempC}
            onChange={(event) => update('bedTempC', Number(event.target.value))}
          />
        </label>
      </div>

      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={values.markFull}
          onChange={(event) => update('markFull', event.target.checked)}
        />
        Mark full — remaining = net weight ({values.netWeightG} g)
      </label>

      <div className={styles.actions}>
        <Button variant="secondary" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add to inventory'}
        </Button>
      </div>
    </form>
  );
}
