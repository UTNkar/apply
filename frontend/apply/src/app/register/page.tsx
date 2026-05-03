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
  const [sectionValue, setSectionValue] = useState(""); // placeholder until dropdown/select
  const [phoneNumberValue, setPhoneNumberValue] = useState("");

  const [error, setError] = useState("");
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
  };

  // you said ignore handleSubmit logic for now
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // minimal client-side check
    if (password !== passwordConfirmation) {
      setError(t("passwordsDoNotMatch"));
      setLoading(false);
      return;
    }

    // TODO: connect real register API later
    setLoading(false);
    // router.push("/account"); // example
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
            error={error && username === "" ? t("registerPage.usernameRequired") : ""}
          />

          <TextInput
            required
            label={t("registerPage.email")}
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder={t("registerPage.emailPlaceholder")}
            error={error && email === "" ? t("registerPage.emailRequired") : ""}
          />

          <TextInput
            required
            label={t("registerPage.password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("registerPage.passwordPlaceholder")}
            error={error && password === "" ? t("registerPage.passwordRequired") : ""}
          />

          <TextInput
            required
            label={t("registerPage.passwordConfirmation")}
            value={passwordConfirmation}
            onChange={handleChange}
            name="passwordConfirmation"
            type="password"
            placeholder={t("registerPage.passwordConfirmationPlaceholder")}
            error={
              error && passwordConfirmation === ""
                ? t("registerPage.passwordConfirmationRequired")
                : ""
            }
          />

          <TextInput
            required
            label={t("registerPage.personalIdentityNumber")}
            value={personalIdentityNumber}
            onChange={handleChange}
            name="personalIdentityNumber"
            type="text"
            placeholder={t("registerPage.PersonNumberPlaceholder")}
            error={
              error && personalIdentityNumber === ""
                ? t("registerPage.PersonNumberRequired")
                : ""
            }
          />

          {/* Placeholder until dropdown/select */}
          <TextInput
            required
            label={t("registerPage.section")}
            value={sectionValue}
            onChange={handleChange}
            name="section"
            type="text"
            placeholder={t("registerPage.sectionPlaceholder")}
            error={error && sectionValue === "" ? t("registerPage.sectionRequired") : ""}
          />

          <TextInput
            required
            label={t("registerPage.phoneNumber")}
            value={phoneNumberValue}
            onChange={handleChange}
            name="phoneNumber"
            type="tel"
            placeholder={t("registerPage.phoneNumberPlaceholder")}
            error={error && phoneNumberValue === "" ? t("registerPage.phoneNumberRequired") : ""}
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

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