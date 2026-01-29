"use client";
import { useState } from "react";
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
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("Open Positions");
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [myPositions, setMyPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data once on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [positionsData, applicationsData] = await Promise.all([
          positionAPI.getAll(),
          applicationAPI.getAll(),
        ]);

        setOpenPositions(positionsData.open_positions);
        setMyPositions(positionsData.my_positions);
        setApplications(applicationsData);
        setError(null);
      } catch {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

      {loading && <p>Loading...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {activeTab === "My Applications" && !loading && (
        <div className={styles.myApplicationsContainer}>
          {applications.length === 0 ? (
            <p>No applications yet</p>
          ) : (
            applications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={{
                  title: application.position_details.role.title,
                  status: application.status,
                  termStart: application.position_details.term_from,
                  termEnd: application.position_details.term_end,
                  applicationId: application.id.toString(),
                }}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "Open Positions" && !loading && (
        <div className={styles.openPositionsContainer}>
          {openPositions.length === 0 ? (
            <p>No open positions available</p>
          ) : (
            openPositions.map((position) => (
              <OpenPositionCard key={position.id} position={position} />
            ))
          )}
        </div>
      )}

      {activeTab === "My Positions" && !loading && (
        <div className={styles.myPositionsContainer}>
          {myPositions.length === 0 ? (
            <p>No positions yet</p>
          ) : (
            myPositions.map((position) => (
              <MyPositionCard
                key={position.id}
                position={{
                  title: position.role.title,
                  termStart: position.term_from,
                  termEnd: position.term_end,
                  applicationId: position.id.toString(),
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
