"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import ApplicationCard from "./components/ApplicationCard";
import LoadingRam from "./components/LoadingRam";
import MyPositionCard from "./components/MyPositionCard";
import OpenPositionCard from "./components/OpenPositionCard";
import { positionAPI, applicationAPI } from "@/utils/api";
import { useIsLoggedIn } from "@/utils/auth";
import type { Position, Application } from "@/utils/types";
import { useTranslation } from "react-i18next";
import "@/i18n/config";

type Tab = "Open Positions" | "My Applications" | "My Positions";

export default function Home() {
  const { t, i18n } = useTranslation();
  const { isLoggedIn, loading: authLoading } = useIsLoggedIn();
  const [activeTab, setActiveTab] = useState<Tab>("Open Positions");
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [myPositions, setMyPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isLoggedIn) {
      setActiveTab("Open Positions");
    }
  }, [isLoggedIn]);

  // Fetch data whenever auth state or language changes
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      try {
        if (isLoggedIn) {
          const [positionsData, applicationsData] = await Promise.all([
            positionAPI.getAll(),
            applicationAPI.getAll(),
          ]);

          setOpenPositions(positionsData.open_positions);
          setMyPositions(positionsData.my_positions);
          setApplications(applicationsData);
          setPositionsError(null);
          setApplicationsError(null);
          return;
        }

        const openPositionsData = await positionAPI.getOpen();
        setOpenPositions(openPositionsData);
        setMyPositions([]);
        setApplications([]);
        setPositionsError(null);
        setApplicationsError(null);
      } catch {
        setPositionsError("homePage.failedToLoadPositions");
        if (isLoggedIn) {
          setApplicationsError("homePage.failedToLoadApplications");
        }
      } finally {
        setTimeout(() => setLoading(false), 50000); // JUST TESTING
        //setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, isLoggedIn, i18n.language]);

  return (
    <div className="pageContainer">
      {!isLoggedIn && (
        <h2 style={{ marginBottom: -32 }}>{t("homePage.openPositions")}</h2>
      )}

      {isLoggedIn && (
        <div className={styles.buttonsContainer}>
          <button
            className={`button ${activeTab === "Open Positions" ? "activeButton" : ""}`}
            onClick={() => setActiveTab("Open Positions")}
          >
            {t("homePage.openPositions")}
          </button>

          <button
            className={`button ${activeTab === "My Applications" ? "activeButton" : ""}`}
            onClick={() => setActiveTab("My Applications")}
          >
            {t("homePage.myApplications")}
          </button>

          <button
            className={`button ${activeTab === "My Positions" ? "activeButton" : ""}`}
            onClick={() => setActiveTab("My Positions")}
          >
            {t("homePage.myPositions")}
          </button>
        </div>
      )}

      {loading && <LoadingRam />}

      {activeTab === "My Applications" && !loading && (
        <>
          {applicationsError && (
            <p className={styles.error}>{t(applicationsError)}</p>
          )}
          <div className={styles.myApplicationsContainer}>
            {applications.length === 0 ? (
              <p>{t("homePage.noApplicationsYet")}</p>
            ) : (
              applications.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
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
              <p>{t("homePage.noOpenPositions")}</p>
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
              <p>{t("homePage.noPositionsYet")}</p>
            ) : (
              myPositions.map((position) => (
                <MyPositionCard key={position.id} position={position} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
