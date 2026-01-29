/*
Todo:
- Navigate to application page when button is clicked, with the id of the application
- Add logo from model
*/

"use client";
import styles from "@/styles/openpositioncard.module.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import type { Position } from "@/types/position";
import { formatDate, formatDateRange } from "@/utils/dateFormat";

type Props = {
  position: Position;
};

const OpenPositionCard = ({ position }: Props) => {
  const [showInfo, setShowInfo] = useState(false);
  const { t, i18n } = useTranslation();

  const title = position.role.title;
  const description = position.role.description;
  const teamName = position.role.team_name;
  const logo = position.role.team_logo;

  const deadline = formatDate(position.recruitment_end);
  const dateRange = formatDateRange(position.term_start, position.term_end);

  return (
    <div className={styles.cardContainer}>
      <div
        className={styles.cardInitial}
        onClick={() => setShowInfo(!showInfo)}
      >
        <div className={styles.cardLogo}>
          <img src={logo} alt={`${teamName} logo`} />
        </div>

        <div className={styles.cardLeftSection}>
          <h3>{title}</h3>
          {teamName}
        </div>

        <div className={styles.cardRightSection}>
          <h4>
            {t("deadline")}: {deadline}
          </h4>

          <button className={"smallButton"}>{t("apply")}</button>
        </div>
      </div>

      <div
        className={`${styles.hiddenSection} ${
          showInfo ? styles.hiddenSectionVisible : ""
        }`}
      >
        <p>
          {t("termOfOffice")}: {dateRange}
        </p>
        <p>
          {t("roleDescription")}: <br />
          {description}
        </p>
      </div>
    </div>
  );
};

export default OpenPositionCard;
