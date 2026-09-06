import { useRef } from 'react';
import type { ClipboardEvent, ChangeEvent, KeyboardEvent } from 'react';
import styles from './CodeInput.module.css';

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  disabled?: boolean;
}

export function CodeInput({ value, onChange, onComplete, length = 6, disabled }: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function commit(nextDigits: string[]) {
    const nextValue = nextDigits.join('');
    onChange(nextValue);
    if (nextValue.length === length && nextDigits.every((d) => d !== '')) {
      onComplete?.(nextValue);
    }
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const char = event.target.value.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    commit(nextDigits);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    const nextDigits = Array.from({ length }, (_, i) => pasted[i] ?? '');
    commit(nextDigits);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div className={styles.row}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          className={styles.box}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
