"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import styles from "../login/login.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function Signup() {
  const { t } = useTranslation();
  const router = useRouter();

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
        <h1 className={styles.title}>{t("registerTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label={t("username")}
            value={username}
            onChange={handleChange}
            name="username"
            type="text"
            placeholder={t("usernamePlaceholder")}
            error={error && username === "" ? t("usernameRequired") : ""}
          />

          <TextInput
            required
            label={t("email")}
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            error={error && email === "" ? t("emailRequired") : ""}
          />

          <TextInput
            required
            label={t("password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            error={error && password === "" ? t("passwordRequired") : ""}
          />

          <TextInput
            required
            label={t("passwordConfirmation")}
            value={passwordConfirmation}
            onChange={handleChange}
            name="passwordConfirmation"
            type="password"
            placeholder={t("passwordConfirmationPlaceholder")}
            error={
              error && passwordConfirmation === ""
                ? t("passwordConfirmationRequired")
                : ""
            }
          />

          <TextInput
            required
            label={t("personalIdentityNumber")}
            value={personalIdentityNumber}
            onChange={handleChange}
            name="personalIdentityNumber"
            type="text"
            placeholder={t("PersonNumberPlaceholder")}
            error={
              error && personalIdentityNumber === ""
                ? t("PersonNumberRequired")
                : ""
            }
          />

          {/* Placeholder until dropdown/select */}
          <TextInput
            required
            label={t("section")}
            value={sectionValue}
            onChange={handleChange}
            name="section"
            type="text"
            placeholder={t("sectionPlaceholder")}
            error={error && sectionValue === "" ? t("sectionRequired") : ""}
          />

          <TextInput
            required
            label={t("phoneNumber")}
            value={phoneNumberValue}
            onChange={handleChange}
            name="phoneNumber"
            type="tel"
            placeholder={t("phoneNumberPlaceholder")}
            error={error && phoneNumberValue === "" ? t("phoneNumberRequired") : ""}
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            className="button activeButton"
            style={{ margin: "12px auto 0" }}
            disabled={loading}
          >
            {loading ? t("creatingAccount") : t("registerAccount")}
          </button>
        </form>

        <div className={styles.links}>
          <a href="/login" className={styles.link}>
            {t("login")}
          </a>
        </div>
      </div>
    </div>
  );
}
