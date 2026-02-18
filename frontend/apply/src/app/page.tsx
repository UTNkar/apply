"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import ApplicationCard from "./components/ApplicationCard";
import MyPositionCard from "./components/MyPositionCard";
import OpenPositionCard from "./components/OpenPositionCard";
import { positionAPI, applicationAPI } from "@/lib/api";
import type { Position, Application } from "@/lib/types";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

type Tab = "Open Positions" | "My Applications" | "My Positions";

export default function Home() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("Open Positions");
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [myPositions, setMyPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(
    null,
  );

  // Fetch all data once on mount
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const positionsData = await positionAPI.getAll();
        setOpenPositions(positionsData.open_positions);
        setMyPositions(positionsData.my_positions);
        setPositionsError(null);
      } catch {
        setPositionsError("failedToLoadPositions");
      }
    };

    const fetchApplications = async () => {
      try {
        const applicationsData = await applicationAPI.getAll();
        setApplications(applicationsData);
        console.log("Fetched applications:", applicationsData);
        setApplicationsError(null);
      } catch {
        setApplicationsError("failedToLoadApplications");
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
    fetchApplications();
  }, [i18n.language]);

  return (
    <div className="pageContainer">
      <h2>
        {activeTab === "Open Positions"
          ? t("openPositions")
          : activeTab === "My Applications"
            ? t("myApplications")
            : t("myPositions")}
      </h2>

      <div className={styles.buttonsContainer}>
        <button
          className={`button ${activeTab === "Open Positions" ? "activeButton" : ""}`}
          onClick={() => setActiveTab("Open Positions")}
        >
          {t("openPositions")}
        </button>

        <button
          className={`button ${activeTab === "My Applications" ? "activeButton" : ""}`}
          onClick={() => setActiveTab("My Applications")}
        >
          {t("myApplications")}
        </button>

        <button
          className={`button ${activeTab === "My Positions" ? "activeButton" : ""}`}
          onClick={() => setActiveTab("My Positions")}
        >
          {t("myPositions")}
        </button>
      </div>

      {loading && <p>{t("loading")}</p>}

      {activeTab === "My Applications" && !loading && (
        <>
          {applicationsError && (
            <p className={styles.error}>{t(applicationsError)}</p>
          )}
          <div className={styles.myApplicationsContainer}>
            {applications.length === 0 ? (
              <p>{t("noApplicationsYet")}</p>
            ) : (
              applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={{
                    title: application.position_details.role.title,
                    status: application.status,
                    termStart: application.position_details.term_from,
                    termEnd: application.position_details.term_end,
                    id: application.id.toString(),
                  }}
                />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "Open Positions" && !loading && (
        <>
          {positionsError && (
            <p className={styles.error}>{t(positionsError)}</p>
          )}
          <div className={styles.openPositionsContainer}>
            {openPositions.length === 0 ? (
              <p>{t("noOpenPositions")}</p>
            ) : (
              openPositions.map((position) => (
                <OpenPositionCard key={position.id} position={position} />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "My Positions" && !loading && (
        <>
          {positionsError && (
            <p className={styles.error}>{t(positionsError)}</p>
          )}
          <div className={styles.myPositionsContainer}>
            {myPositions.length === 0 ? (
              <p>{t("noPositionsYet")}</p>
            ) : (
              myPositions.map((position) => (
                <MyPositionCard
                  key={position.id}
                  position={{
                    termStart: position.term_from,
                    termEnd: position.term_end,
                    id: position.id.toString(),
                    role: position.role
                  }}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
