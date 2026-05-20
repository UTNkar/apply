"use client";

import { useState } from "react";
import styles from "@/styles/application.module.css";

type FormTextareaProps = {
  disabled?: boolean;
  error?: string;
  label?: string;
  name?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  value: string;
};

export default function FormTextarea({
  disabled = false,
  error,
  label,
  name,
  onChange,
  placeholder,
  required,
  rows = 4,
  value,
}: FormTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={styles.formField}>
      {label && (
        <label className={styles.formLabel}>
          {label}
          {required && <span className={styles.requiredAsterisk}> *</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        className={`${styles.formTextarea} ${error ? styles.textareaError : ""} ${isFocused ? styles.textareaFocused : ""}`}
      />
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}
