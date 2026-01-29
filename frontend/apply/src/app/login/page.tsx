"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import styles from "./login.module.css";
import { logIn } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await logIn(email, password);

      if (response.status === 200) {
        window.dispatchEvent(new CustomEvent("logged-in"));
        router.push("/account");
      } else if (response.status === 401) {
        setError(t("incorrectCredentials"));
      } else if (response.status === 403) {
        const data = await response.json();
        setError(data.message || t("emailNotVerified"));
      } else {
        setError(t("loginError"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") setEmail(value);
    if (name === "password") setPassword(value);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>{t("loginTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
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

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            className="button activeButton"
            style={{ margin: "12px auto 0" }}
            disabled={loading}
          >
            {loading ? t("signingIn") : t("signIn")}
          </button>
        </form>

        <div className={styles.links}>
          <a href="/signup" className={styles.link}>
            {t("noAccount")}
          </a>
          <a href="/forgot-password" className={styles.link}>
            {t("forgotPassword")}
          </a>
        </div>
      </div>
    </div>
  );
}
