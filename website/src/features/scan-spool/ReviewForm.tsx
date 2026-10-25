import { useState } from 'react';
import { MATERIAL_TAGS, MATERIAL_TYPES } from '../../api/types';
import type { MaterialTag, MaterialType } from '../../api/types';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { ColorInput } from '../../components/ColorInput';
import { Field } from '../../components/Field';
import { NumberInput } from '../../components/NumberInput';
import { Select } from '../../components/Select';
import { Text } from '../../components/Text';
import { TextInput } from '../../components/TextInput';
import styles from './ReviewForm.module.css';
import { humanizeEnum } from '../../utils/format';

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
        <Field label="Brand">
          <TextInput
            value={values.brand}
            onChange={(event) => update('brand', event.target.value)}
            required
          />
        </Field>
        <Field label="Spool name">
          <TextInput
            value={values.materialName}
            onChange={(event) => update('materialName', event.target.value)}
            required
          />
        </Field>
        <Field label="Color">
          <ColorInput value={values.colorHex} onChange={(hex) => update('colorHex', hex)} />
        </Field>
        <Field label="Material">
          <Select
            value={values.materialType}
            onChange={(event) => update('materialType', event.target.value as MaterialType)}
          >
            {MATERIAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Finish">
          <Select
            value={values.finish}
            onChange={(event) => update('finish', event.target.value as MaterialTag)}
          >
            {MATERIAL_TAGS.map((tag) => (
              <option key={tag} value={tag}>
                {humanizeEnum(tag)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Net weight">
          <NumberInput
            unit="g"
            value={values.netWeightG}
            min={0}
            // "any" rather than a round step: real tags report measured
            // weights (868 g on a Prusament spool), which a step of 10 would
            // reject as invalid and silently block the form from submitting.
            step="any"
            onChange={(event) => update('netWeightG', Number(event.target.value))}
            required
          />
        </Field>
        <Field label="Diameter">
          <NumberInput
            unit="mm"
            value={values.filamentDiameterMm}
            min={0}
            step={0.05}
            onChange={(event) => update('filamentDiameterMm', Number(event.target.value))}
            required
          />
        </Field>
        <Field label="Empty spool weight">
          <NumberInput
            unit="g"
            value={values.emptyContainerWeightG}
            min={0}
            // See net weight above -- a real tag reported 277 g, which a step
            // of 5 would reject.
            step="any"
            onChange={(event) => update('emptyContainerWeightG', Number(event.target.value))}
            required
          />
        </Field>
        {/* Two inputs, so a fieldset/legend names the pair instead of a Field. */}
        <fieldset className={styles.range}>
          <Text as="legend" variant="eyebrow" className={styles.legend}>
            Nozzle temp
          </Text>
          <div className={styles.rangeInputs}>
            <NumberInput
              unit="°C"
              aria-label="Minimum nozzle temperature"
              value={values.minNozzleTempC}
              onChange={(event) => update('minNozzleTempC', Number(event.target.value))}
            />
            <span className={styles.rangeSep} aria-hidden="true">
              –
            </span>
            <NumberInput
              unit="°C"
              aria-label="Maximum nozzle temperature"
              value={values.maxNozzleTempC}
              onChange={(event) => update('maxNozzleTempC', Number(event.target.value))}
            />
          </div>
        </fieldset>
        <Field label="Bed temp">
          <NumberInput
            unit="°C"
            value={values.bedTempC}
            onChange={(event) => update('bedTempC', Number(event.target.value))}
          />
        </Field>
      </div>

      <Checkbox
        className={styles.markFull}
        checked={values.markFull}
        onChange={(event) => update('markFull', event.target.checked)}
      >
        Mark full — remaining = net weight ({values.netWeightG} g)
      </Checkbox>

      <div className={styles.actions}>
        <Button variant="secondary" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className={styles.submitButton} loading={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add to inventory'}
        </Button>
      </div>
    </form>
  );
}
