"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import styles from "./login.module.css";
import { logIn, useIsLoggedIn } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function Login() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const { isLoggedIn, loading } = useIsLoggedIn();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);

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
      const response = await logIn(identifier, password);

      if (response.status === 200) {
        window.dispatchEvent(new CustomEvent("logged-in"));

        const isSafeRedirect = (path: string | null) => {
          if (!path) return false;
          // Disallow absolute URLs or protocol markers
          if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(path)) return false;
          // Must be a normalized absolute path within this site
          if (!path.startsWith("/")) return false;
          // Prevent double slashes or attempts to break out
          if (path.includes("//")) return false;
          // Only allow redirects under /apply (application form pages)
          return /^\/apply(\/.*)?$/.test(path);
        };

        const next = rawNext;
        if (isSafeRedirect(next)) {
          router.push(next as string);
        } else {
          router.push("/");
        }
      } else if (response.status === 401) {
        setError(t("loginPage.incorrectCredentials"));
      } else if (response.status === 403) {
        const data = await response.json();
        setError(data.message || t("loginPage.loginError"));
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
    if (name === "identifier") setIdentifier(value);
    if (name === "password") setPassword(value);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>{t("loginPage.loginTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label={t("loginPage.identifier")}
            value={identifier}
            onChange={handleChange}
            name="identifier"
            type="text"
            placeholder={t("loginPage.identifierPlaceholder")}
            error={
              error && identifier === ""
                ? t("loginPage.identifierRequired")
                : ""
            }
          />

          <TextInput
            required
            label={t("loginPage.password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("loginPage.passwordPlaceholder")}
            error={
              error && password === "" ? t("loginPage.passwordRequired") : ""
            }
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

          <Button
            style={{ margin: "16px auto 0" }}
            disabled={loadingForm}
            loading={loadingForm}
            type={"submit"}
          >
            {t("loginPage.signIn")}
          </Button>
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
