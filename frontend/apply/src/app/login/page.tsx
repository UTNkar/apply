"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import styles from "./login.module.css";
import { logIn, useIsLoggedIn } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoggedIn, loading } = useIsLoggedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingForm, setLoading] = useState(false);

  useEffect(() => {
    if (!loading && isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingForm(true);

    try {
      const response = await logIn(email, password);

      if (response.status === 200) {
        window.dispatchEvent(new CustomEvent("logged-in"));
        router.push("/");
      } else if (response.status === 401) {
        setError(t("loginPage.incorrectCredentials"));
      } else if (response.status === 403) {
        const data = await response.json();
        setError(data.message || t("loginPage.emailNotVerified"));
      } else {
        setError(t("loginPage.loginError"));
      }
    } catch {
      setError(t("loginPage.networkError"));
    } finally {
      setLoadingForm(false);
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
        <h1 className={styles.title}>{t("loginPage.loginTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label={t("common.email")}
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder={t("loginPage.emailPlaceholder")}
            error={error && email === "" ? t("loginPage.emailRequired") : ""}
          />

          <TextInput
            required
            label={t("loginPage.password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("loginPage.passwordPlaceholder")}
            error={error && password === "" ? t("loginPage.passwordRequired") : ""}
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            className="button activeButton"
            style={{ margin: "12px auto 0" }}
            disabled={loadingForm}
          >
            {loadingForm ? t("loginPage.signingIn") : t("loginPage.signIn")}
          </button>
        </form>

        <div className={styles.links}>
          <a href="/register" className={styles.link}>
            {t("loginPage.noAccount")}
          </a>
          <a href="/forgot-password" className={styles.link}>
            {t("loginPage.forgotPassword")}
          </a>
        </div>
      </div>
    </div>
  );
}
