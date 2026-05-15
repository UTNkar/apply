"use client";
import { useEffect, useRef, useState, Suspense, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./reset-password.module.css";
import TextInput from "@/components/TextInput";
import Button from "@/components/Button";
import { request, Method } from "@/utils/request";
import "@/i18n/config";

function VerifyEmailForm() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const codeFromQuery = searchParams.get("code");

    const [verificationCode, setVerificationCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendMessage, setResendMessage] = useState("");
    const [resendError, setResendError] = useState(false);
    const lastAutoSubmittedCode = useRef<string | null>(null);

    const handleSubmit = async (e?: FormEvent, code?: string) => {
        e?.preventDefault();
        setError("");

        const normalizedCode = code || verificationCode.trim().toUpperCase();
        const isValidCode = /^[A-Z0-9]{6}$/.test(normalizedCode);

        if (!isValidCode) {
            setError(t("verifyEmailPage.codeInvalid"));
            return;
        }

        setLoading(true);

        try {
            const query = new URLSearchParams({
                code: normalizedCode,
            });
            if (email) {
                query.set("email", email);
            }

            const res = await request(
                Method.GET,
                `/auth/verify-email?${query.toString()}`,
            );

            if (res.ok) {
                window.dispatchEvent(new CustomEvent("logged-in"));
                router.push("/");
            } else {
                let message = "";
                try {
                    const data = await res.json();
                    if (data && typeof data.message === "string") {
                        message = data.message;
                    }
                } catch {
                    message = "";
                }
                setError(message || t("verifyEmailPage.invalidOrExpired"));
            }
        } catch {
            setError(t("verifyEmailPage.error"));
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async (e?: MouseEvent<HTMLAnchorElement>) => {
        e?.preventDefault();

        if (!email) {
            setResendMessage(t("verifyEmailPage.resendError"));
            setResendError(true);
            return;
        }

        setResendLoading(true);
        setResendMessage("");

        try {
            const res = await request(
                Method.POST,
                "/auth/resend-verification-email",
                { email }
            );

            if (res.ok) {
                setResendMessage(t("verifyEmailPage.resendSuccess"));
                setResendError(false);
            } else {
                setResendMessage(t("verifyEmailPage.resendError"));
                setResendError(true);
            }
        } catch {
            setResendMessage(t("verifyEmailPage.resendError"));
            setResendError(true);
        } finally {
            setResendLoading(false);
        }
    };

    useEffect(() => {
        if (!codeFromQuery) {
            return;
        }

        const normalizedCode = codeFromQuery.trim().toUpperCase();
        if (lastAutoSubmittedCode.current === normalizedCode) {
            return;
        }

        const isValidCode = /^[A-Z0-9]{6}$/.test(normalizedCode);
        if (!isValidCode) {
            setError(t("verifyEmailPage.codeInvalid"));
            return;
        }

        lastAutoSubmittedCode.current = normalizedCode;
        setVerificationCode(normalizedCode);
        void handleSubmit(undefined, normalizedCode);
    }, [codeFromQuery, t]);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>{t("verifyEmailPage.title")}</h1>
                <p>{t("verifyEmailPage.instructions")}</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <TextInput
                        label={t("verifyEmailPage.verificationCode")}
                        name="verificationCode"
                        type="text"
                        value={verificationCode}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setVerificationCode(e.target.value.toUpperCase())
                        }
                        required
                    />

                    {error && <p className={styles.errorMessage}>{error}</p>}

                    <Button loading={loading} disabled={loading} style={{ margin: "0 auto" }}>
                        {t("verifyEmailPage.verifyButton")}
                    </Button>
                </form>

                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <a
                        href="#"
                        className={styles.link}
                        onClick={handleResend}
                        aria-disabled={resendLoading || !email}
                        style={{ pointerEvents: resendLoading || !email ? "none" : undefined }}
                    >
                        {t("verifyEmailPage.resendButton")}
                    </a>
                    {resendMessage && (
                        <p style={{ marginTop: "0.5rem" }} className={resendError ? styles.errorMessage : styles.successMessage}>
                            {resendMessage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailForm />
        </Suspense>
    );
}
