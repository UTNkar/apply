"use client";

import { useState } from "react";
import TextInput from "@/components/TextInput";
import styles from "../register/login.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import Button from "@/components/Button";

export default function Signup() {
  const { t } = useTranslation();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [personalIdentityNumber, setPersonalIdentityNumber] = useState("");
  const [sectionValue, setSectionValue] = useState("");
  const [phoneNumberValue, setPhoneNumberValue] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "username") setUsername(value);
    if (name === "email") setEmail(value);
    if (name === "password") setPassword(value);
    if (name === "passwordConfirmation") setPasswordConfirmation(value);
    if (name === "personalIdentityNumber") setPersonalIdentityNumber(value);
    if (name === "section") setSectionValue(value);
    if (name === "phoneNumber") setPhoneNumberValue(value);

    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = t("registerPage.usernameRequired");
    } else if (username.trim().length < 3) {
      newErrors.username = t("registerPage.usernameTooShort"); // "Username must be at least 3 characters"
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = t("registerPage.emailRequired");
    } else if (!emailRegex.test(email)) {
      newErrors.email = t("registerPage.emailInvalid"); // "Please enter a valid email address"
    }

    if (!password) {
      newErrors.password = t("registerPage.passwordRequired");
    } else if (password.length < 8) {
      newErrors.password = t("registerPage.passwordTooShort"); // "Password must be at least 8 characters"
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t("registerPage.passwordNeedsUppercase"); // "Password must contain at least one uppercase letter"
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t("registerPage.passwordNeedsNumber"); // "Password must contain at least one number"
    }

    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = t("registerPage.passwordConfirmationRequired");
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = t("registerPage.passwordsDoNotMatch"); // "Passwords do not match"
    }

    // Swedish personal identity number: YYYYMMDD-XXXX or YYYYMMDDXXXX
    const pinRegex = /^\d{8}[-]?\d{4}$/;
    if (!personalIdentityNumber.trim()) {
      newErrors.personalIdentityNumber = t("registerPage.PersonNumberRequired");
    } else if (!pinRegex.test(personalIdentityNumber.trim())) {
      newErrors.personalIdentityNumber = t("registerPage.PersonNumberInvalid"); // "Enter a valid personal identity number (YYYYMMDD-XXXX)"
    }

    // Section
    if (!sectionValue.trim()) {
      newErrors.section = t("registerPage.sectionRequired");
    }

    // Phone number: allows +, spaces, dashes, digits; min 7 digits
    const phoneRegex = /^[+\d][\d\s\-()]{6,}$/;
    if (!phoneNumberValue.trim()) {
      newErrors.phoneNumber = t("registerPage.phoneNumberRequired");
    } else if (!phoneRegex.test(phoneNumberValue.trim())) {
      newErrors.phoneNumber = t("registerPage.phoneNumberInvalid"); // "Enter a valid phone number"
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    // TODO: Register API
    setLoading(false);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>{t("registerPage.registerTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label={t("registerPage.username")}
            value={username}
            onChange={handleChange}
            name="username"
            type="text"
            placeholder={t("registerPage.usernamePlaceholder")}
            error={errors.username}
          />

          <TextInput
            required
            label={t("registerPage.email")}
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder={t("registerPage.emailPlaceholder")}
            error={errors.email}
          />

          <TextInput
            required
            label={t("registerPage.password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("registerPage.passwordPlaceholder")}
            error={errors.password}
          />

          <TextInput
            required
            label={t("registerPage.passwordConfirmation")}
            value={passwordConfirmation}
            onChange={handleChange}
            name="passwordConfirmation"
            type="password"
            placeholder={t("registerPage.passwordConfirmationPlaceholder")}
            error={errors.passwordConfirmation}
          />

          <TextInput
            required
            label={t("registerPage.personalIdentityNumber")}
            value={personalIdentityNumber}
            onChange={handleChange}
            name="personalIdentityNumber"
            type="text"
            placeholder={t("registerPage.PersonNumberPlaceholder")}
            error={errors.personalIdentityNumber}
          />

          <TextInput
            required
            label={t("registerPage.section")}
            value={sectionValue}
            onChange={handleChange}
            name="section"
            type="text"
            placeholder={t("registerPage.sectionPlaceholder")}
            error={errors.section}
          />

          <TextInput
            required
            label={t("registerPage.phoneNumber")}
            value={phoneNumberValue}
            onChange={handleChange}
            name="phoneNumber"
            type="tel"
            placeholder={t("registerPage.phoneNumberPlaceholder")}
            error={errors.phoneNumber}
          />
        </form>

        <div className={styles.links}>
          <Button
            className="button activeButton"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
          >
            {t("registerPage.registerAccount")}
          </Button>
          <a href="/login" className={styles.link}>
            {t("navbar.login")}
          </a>
        </div>
      </div>
    </div>
  );
}