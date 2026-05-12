"use client";

import { useState } from "react";
import styles from "@/styles/application.module.css";

type FormInputProps = {
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  label: string;
  name?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: "text" | "email" | "tel" | "password" | "number";
  value: string;
};

export default function FormInput({
  disabled = false,
  error,
  icon,
  label,
  name,
  onChange,
  placeholder,
  required,
  type = "text",
  value,
}: FormInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={styles.formFieldWithIcon}>
      <label className={styles.formLabel}>{label}</label>
      <div style={{ position: "relative" }}>
        {icon && <span className={styles.inputIcon}>{icon}</span>}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          className={`${icon ? styles.inputWithIcon : styles.formInput} ${error ? styles.inputError : ""} ${isFocused ? styles.inputFocused : ""}`}
        />
      </div>
      {error && <p className={styles.fieldError}>{error}</p>}
    </div>
  );
}
