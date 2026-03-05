"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import styles from "./forgot-password.module.css";

export default function ForgotPasswordPage() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("http://localhost:8000/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
                credentials: "include",
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                // This case should actually never happen since we never respond with other than 200 (ok)
                setError(t("forgotPasswordPage.error"));
            }
        } catch {
            setError(t("forgotPasswordPage.error"));
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1>{t("forgotPasswordPage.checkEmail")}</h1>
                    <p>{t("forgotPasswordPage.emailSent")}</p>
                    <Link href="/login" className={styles.link}>
                        {t("forgotPasswordPage.backToLogin")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>{t("forgotPasswordPage.title")}</h1>
                <p>{t("forgotPasswordPage.description")}</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="email">{t("email")}</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={styles.input}
                    />

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} className="button">
                        {loading ? t("loading") : t("forgotPasswordPage.submit")}
                    </button>
                </form>

                <Link href="/login" className={styles.link}>
                    {t("forgotPasswordPage.backToLogin")}
                </Link>
            </div>
        </div>
    );
}