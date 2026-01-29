"use client";
import { useState } from "react";
import styles from "./page.module.css";
import ApplicationCard from "@/components/ApplicationCard";
import MyPositionCard from "@/components/MyPositionCard";
import OpenPositionCard from "./components/OpenPositionCard";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { Application, Position } from "@/types/position";

export default function Home() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Open Positions");

  const applicationDummies: Application[] = [
    {
      id: 1,
      title_en: "Head of the Pub Crew 2025",
      title_sv: "Pubmästare 2025",
      status: "appointed",
      term_start: "2025-09-01",
      term_end: "2026-06-30",
    },
    {
      id: 2,
      title_en: "Binär 2024",
      title_sv: "Binär 2024",
      status: "turnedDown",
      term_start: "2024-09-01",
      term_end: "2025-06-30",
    },
    {
      id: 3,
      title_en: "Buddy 2023",
      title_sv: "Fadder 2023",
      status: "appointed",
      term_start: "2023-09-01",
      term_end: "2024-06-30",
    },
  ];

  const openPositionDummies: Position[] = [
    {
      id: 4,
      role: {
        title_en: "Open position 2025",
        title_sv: "Öppen post 2025",
        description_en: "You will be responsible for creating positions :)",
        description_sv: "Du kommer att vara ansvarig för att skapa poster :)",
        contact_email: null,
        team: {
          id: 1,
          name_en:
            "Engineering, Computer Science, and Foundation Year Reception",
          name_sv: "Teknolog-, datavetar- och basårsmottagningen",
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
          name_en: "Cafe Group",
          name_sv: "Cafégruppen",
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
        title_en: "My position 2025",
        title_sv: "Min post 2025",
      },
      term_start: "2026-09-01",
      term_end: "2027-06-30",
      application: "4",
    },
    {
      role: {
        title_en: "Another position 2025",
        title_sv: "Ytterligare en post 2025",
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
          {openPositionDummies.map((position, index) => (
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
