"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { applicationAPI, positionAPI } from "@/utils/api";
import type { Application, Position } from "@/utils/types";
import ApplicationForm from "@/components/ApplicationForm";
import PositionInfoCard from "@/components/PositionInfoCard";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import styles from "@/styles/application.module.css";
import Link from "next/link";

type APIError = {
  detail?: string;
  status: number;
};

const isAuthenticationError = (error: unknown) => {
  const apiError = error as APIError;
  return apiError.status === 403;
};

export default function ApplyPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const positionId = Number(params.id);

  const [position, setPosition] = useState<Position | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let shouldShowLoginPrompt = false;

        const positionData = await positionAPI.getById(positionId).catch(async (error) => {
          if (!isAuthenticationError(error)) {
            throw error;
          }

          const openPositions = await positionAPI.getOpen();
          shouldShowLoginPrompt = true;
          return openPositions.find((position) => position.id === positionId) || null;
        });

        if (!positionData) {
          setPosition(null);
          setApplication(null);
          setShowLoginPrompt(false);
          setError("applyPage.positionNotFound");
          return;
        }

        const applicationData = await applicationAPI
          .getByPositionId(positionId)
          .catch((error) => {
            if (error.status === 404) {
              return null;
            }

            if (isAuthenticationError(error)) {
              shouldShowLoginPrompt = true;
              return null;
            }

            throw error;
          });

        setPosition(positionData);
        setApplication(applicationData);
        setShowLoginPrompt(shouldShowLoginPrompt);
        setError(null);
      } catch {
        setError("applyPage.failedToLoadPosition");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [positionId, i18n.language]);

  if (loading)
    return (
      <div className="pageContainer">
        <p>{t("common.loading")}</p>
      </div>
    );
  if (error)
    return (
      <div className="pageContainer">
        <p style={{ color: "red" }}>{t(error)}</p>
      </div>
    );
  if (!position)
    return (
      <div className="pageContainer">
        <p>{t("applyPage.positionNotFound")}</p>
      </div>
    );

  if (showLoginPrompt)
    return (
      <div className="pageContainer">
        <div className={styles.pageHeader}>
          <h2>{position.role.title}</h2>
        </div>

        <PositionInfoCard position={position} />

        <div className={styles.guestLoginCard}>
          <p>{t("applyPage.loginRequiredMessage")}</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/apply/${positionId}`)}`}
            className={`button activeButton ${styles.guestLoginButton}`}
          >
            {t("applyPage.goToLogin")}
          </Link>
        </div>
      </div>
    );

  return (
    <ApplicationForm
      position={position}
      existingApplication={application ?? undefined}
    />
  );
}
