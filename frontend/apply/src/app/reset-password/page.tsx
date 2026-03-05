"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import styles from "./reset-password.module.css";

function ResetPasswordForm() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();

    const id = searchParams.get("id");
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // If the link is missing params, show an error immediately
    if (!id || !token) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p className={styles.error}>{t("resetPasswordPage.invalidLink")}</p>
                    <Link href="/forgot-password" className={styles.link}>
                        {t("resetPasswordPage.requestNewLink")}
                    </Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (newPassword !== confirmPassword) {
            setError(t("resetPasswordPage.passwordMismatch"));
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, token, new_password: newPassword }),
                credentials: "include",
            });

            if (res.ok) {
                router.push("/login?reset=success");
            } else {
                setError(t("resetPasswordPage.invalidOrExpired"));
            }
        } catch {
            setError(t("resetPasswordPage.error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>{t("resetPasswordPage.title")}</h1>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <label htmlFor="new-password">{t("resetPasswordPage.newPassword")}</label>
                    <input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                        className={styles.input}
                    />

                    <label htmlFor="confirm-password">{t("resetPasswordPage.confirmPassword")}</label>
                    <input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        className={styles.input}
                    />

                    {error && <p className={styles.error}>{error}</p>}

                    <button type="submit" disabled={loading} className="button">
                        {loading ? t("loading") : t("resetPasswordPage.submit")}
                    </button>
                </form>
            </div>
        </div>
    );
}

// useSearchParams requires Suspense in Next.js app router
export default function ResetPasswordPage() {
    return (
        <Suspense>
            <ResetPasswordForm />
        </Suspense>
    );
}