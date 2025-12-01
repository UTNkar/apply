'use client';

import { useState } from 'react';
import styles from '../styles/textinput.module.css';

interface TextInputProps {
  label: string;
  value: string;
  name: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
}

export default function TextInput({
  label,
  value,
  onChange,
  icon,
  type = 'text',
  name,
  placeholder = '',
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`${styles.container} ${isFocused ? styles.focused : ''}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.inputWrapper}>
        <label className={styles.label}>{label}</label>
        <input
          type={type}
          value={value}
          name={name}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={styles.input}
        />
        <div className={styles.underline} />
      </div>
    </div>
  );
}
