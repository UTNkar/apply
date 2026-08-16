"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import styles from "./reset-password.module.css";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { request, Method } from "@/utils/request";
import "@/i18n/config";

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

    if (!id || !token) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <p className={styles.errorMessage}>{t("resetPasswordPage.invalidLink")}</p>
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
            const res = await request(Method.POST, "/auth/reset", {
                id,
                token,
                new_password: newPassword,
            });

            if (res.ok) {
                router.push("/login?reset=success");
            } else {
                const errorData = await res.json().catch(() => ({}));
                setError(
                    errorData?.message || t("resetPasswordPage.invalidOrExpired"),
                );
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
                    <TextInput
                        label={t("resetPasswordPage.newPassword")}
                        name="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                        required
                    />

                    <TextInput
                        label={t("resetPasswordPage.confirmPassword")}
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                        required
                    />

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <Button loading={loading} disabled={loading} style={{ margin: "0 auto" }} type="submit">
                        {t("resetPasswordPage.submit")}
                    </Button>
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
