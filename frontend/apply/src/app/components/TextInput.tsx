"use client";

import { useState } from "react";
import "../styles/textinput.css";

interface TextInputProps {
  disabled?: boolean;
  error?: string;
  icon?: React.ReactNode;
  label: string;
  name: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  options?: { value: string; name: string }[];
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}

export default function TextInput({
  disabled = false,
  error,
  icon,
  label,
  name,
  onChange,
  options = [],
  placeholder = "",
  required,
  type = "text",
  value,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  if (type === "select" && options.length === 0) {
    disabled = true;
  }

  return (
    <div
      className={`text-input-container ${isFocused ? "focused" : ""}
      ${disabled ? "disabled" : ""} ${error ? "error" : ""}`}
    >
      {icon && <div className="icon">{icon}</div>}
      <div className="input-wrapper">
        <label className="label">{label}</label>
        {type === "select" ? (
          <select
            required={required}
            value={value}
            name={name}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={"input"}
            disabled={disabled}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            required={required}
            type={type}
            value={value}
            name={name}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={"input"}
            disabled={disabled}
          />
        )}
        <div className="underline" />
        <span className={`error-text ${error ? "" : "hidden"}`}>{error}</span>
      </div>
    </div>
  );
}
