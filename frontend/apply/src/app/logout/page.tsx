"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./logout.module.css";
import { logOut } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { stringify } from "querystring";

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
        setError("An error occurred during logout");
      }
    } catch {
      setError("Network error. Please try again.");
    } 
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>{t("doYouWantToLogOut")}</h1>
      
      <div className={styles.buttonContainer}>
        <button
          onClick={handleLogout}
          className={styles.confirmButton}
        >
          {t("yesLogOut")}
        </button>

        <button
          onClick={() => router.push("/")}
          className={styles.cancelButton}
        >
          {t("noCancel")}
        </button>
      </div>
      <div className="error">
          {error}
      </div>
    </div>
  );
}
