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
  type = "text",
  value,
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`text-input-container ${isFocused ? "focused" : ""} ${
        disabled ? "disabled" : ""
      }`}
    >
      {icon && <div className="icon">{icon}</div>}
      <div className="input-wrapper">
        <label className="label">{label}</label>
        {type === "select" ? (
          <select
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
        <span className={`error ${error ? "" : "hidden"}`}>{error}</span>
      </div>
    </div>
  );
}
