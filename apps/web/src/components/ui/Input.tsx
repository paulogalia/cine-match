import type { ChangeEvent } from 'react';
import styles from './Input.module.css';

interface InputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoComplete?: string;
  autoFocus?: boolean;
  codeStyle?: boolean;
  error?: string | null;
  hint?: string;
  'data-testid'?: string;
}

export function Input({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  autoComplete = 'off',
  autoFocus = false,
  codeStyle = false,
  error,
  hint,
  'data-testid': dataTestId,
}: InputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        data-testid={dataTestId}
        aria-invalid={Boolean(error)}
        className={`${styles.input} ${codeStyle ? styles.codeInput : ''}`}
      />
      {error ? (
        <span className={styles.errorText} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}
