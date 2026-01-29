"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import ApplicationCard from "@/components/ApplicationCard";
import MyPositionCard from "@/components/MyPositionCard";
import OpenPositionCard from "./components/OpenPositionCard";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { title } from "process";
import { Application, Position } from "@/types/position";
import { request, Method } from "@/utils/request";

export default function Home() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Open Positions");
  const [openPositions, setOpenPositions] = useState<Position[]>([]);

  useEffect(() => {
    const fetchOpenPositions = async () => {
      try {
        const response = await request(Method.GET, "/open-positions/");
        const data = await response.json();
        setOpenPositions(data);
      } catch (error) {
        console.error("Failed to fetch open positions:", error);
      }
    };

    fetchOpenPositions();
  }, []);

  const applicationDummies: Application[] = [
    {
      id: 1,
      title: "Head of the Pub Crew 2025",
      status: "appointed",
      term_start: "2025-09-01",
      term_end: "2026-06-30",
    },
    {
      id: 2,
      title: "Binär 2024",
      status: "turnedDown",
      term_start: "2024-09-01",
      term_end: "2025-06-30",
    },
    {
      id: 3,
      title: "Buddy 2023",
      status: "appointed",
      term_start: "2023-09-01",
      term_end: "2024-06-30",
    },
  ];

  const openPositionDummies: Position[] = [
    {
      id: 4,
      role: {
        title: "Open position 2025",
        description: "You will be responsible for creating positions :)",
        contact_email: null,
        team: {
          id: 1,
          name: "Engineering, Computer Science, and Foundation Year Reception",
        },
      },
      recruitment_start: "2026-03-01",
      recruitment_end: "2026-04-12",
      term_start: "2026-09-01",
      term_end: "2027-06-30",
      slots_available: 1,
    },
    {
      id: 5,
      role: {
        title_en: "Cafe Host 2025",
        title_sv: "Cafévärd 2025",
        description_en:
          "As a member of the Café Group you will, in consultation with the café manager, help run the cafe during the daytime.",
        description_sv:
          "Som medlem i Cafégruppen kommer du, i samråd med caféföreståndaren hjälpa till att driva caféet under dagtid.",
        contact_email: "cafe@utn.se",
        team: {
          id: 2,
          name: "Cafe Group",
        },
      },
      recruitment_start: "2026-03-01",
      recruitment_end: "2026-04-12",
      term_start: "2026-09-01",
      term_end: "2027-06-30",
      slots_available: 6,
    },
  ];

  const myPositionDummies: Position[] = [
    {
      role: {
        title: "My position 2025",
      },
      term_start: "2026-09-01",
      term_end: "2027-06-30",
      application: "4",
    },
    {
      role: {
        title: "Another position 2025",
      },
      term_start: "2026-10-01",
      term_end: "2027-05-25",
      application: "5",
    },
  ];

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
          className={`button ${
            activeTab === "Open Positions" ? "activeButton" : ""
          }`}
          onClick={() => setActiveTab("Open Positions")}
        >
          {t("openPositions")}
        </button>

        <button
          className={`button ${
            activeTab === "My Applications" ? "activeButton" : ""
          }`}
          onClick={() => setActiveTab("My Applications")}
        >
          {t("myApplications")}
        </button>

        <button
          className={`button ${
            activeTab === "My Positions" ? "activeButton" : ""
          }`}
          onClick={() => setActiveTab("My Positions")}
        >
          {t("myPositions")}
        </button>
      </div>

      {activeTab === "My Applications" && (
        <div className={styles.myApplicationsContainer}>
          {applicationDummies.map((application, index) => (
            <ApplicationCard key={index} application={application} />
          ))}
        </div>
      )}

      {activeTab === "Open Positions" && (
        <div className={styles.openPositionsContainer}>
          {openPositions.map((position, index) => (
            <OpenPositionCard key={index} position={position} />
          ))}
        </div>
      )}

      {activeTab === "My Positions" && (
        <div className={styles.myPositionsContainer}>
          {myPositionDummies.map((position, index) => (
            <MyPositionCard key={index} position={position} />
          ))}
        </div>
      )}
    </div>
  );
}
