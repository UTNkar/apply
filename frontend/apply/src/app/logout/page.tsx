"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./logout.module.css";
import { logOut } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function LogOut() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setError("");

    try {
      const response = await logOut();
      if (response.status === 200) {
        window.dispatchEvent(new CustomEvent('logged-out'));
        router.push("/");
      } else {
        setError(t("logoutPage.logoutError"));
      }
    } catch {
      setError(t("logoutPage.networkError"));
    } 
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{t("logoutPage.doYouWantToLogOut")}</h1>
      
      <div className={styles.buttonContainer}>
        <button
          onClick={handleLogout}
          className={styles.confirmButton}
        >
          {t("logoutPage.yesLogOut")}
        </button>

        <button
          onClick={() => router.push("/")}
          className={styles.cancelButton}
        >
          {t("logoutPage.noCancel")}
        </button>
      </div>
      <div className="error">
          {error}
      </div>
    </div>
  );
}
