"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import styles from "./forgot-password.module.css";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { request, Method } from "@/utils/request";
import "@/i18n/config";

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
            const res = await request(Method.POST, "/auth/reset-password", { email });

            if (res.ok) {
                setSubmitted(true);
            } else {
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
                    <TextInput
                        label={t("common.email")}
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                        required
                    />

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <div className={styles.actions}>
                        <Link href="/login" className={styles.link}>
                            {t("forgotPasswordPage.backToLogin")}
                        </Link>
                        <Button loading={loading} disabled={loading}>
                            {t("forgotPasswordPage.submit")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
