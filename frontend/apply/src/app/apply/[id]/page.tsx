"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { applicationAPI, positionAPI } from "@/utils/api";
import type { Application, Position } from "@/utils/types";
import ApplicationForm from "@/components/ApplicationForm";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

export default function ApplyPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const positionId = Number(params.id);

  const [position, setPosition] = useState<Position | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [positionData, applicationData] = await Promise.all([
          positionAPI.getById(positionId),
          applicationAPI.getByPositionId(positionId).catch((error) => {
            if (error.detail === "Application not found for this position.") {
              // No application exists, return null
              return null;
            }
            throw new Error(error.detail || "Failed to load application");
          }),
        ]);
        setPosition(positionData);
        setApplication(applicationData);
        setError(null);
      } catch {
        setError("failedToLoadPosition");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [positionId, i18n.language]);

  if (loading)
    return (
      <div className="pageContainer">
        <p>{t("loading")}</p>
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
        <p>{t("positionNotFound")}</p>
      </div>
    );

  return (
    <ApplicationForm
      position={position}
      existingApplication={application ?? undefined}
    />
  );
}
