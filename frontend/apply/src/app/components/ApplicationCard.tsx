/*
Todo:
- Navigate to application page when button is clicked, with the id of the application
- Add logo from model
*/

"use client";
import styles from "@/styles/applicationcard.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import type { Application } from "@/types/position";
import { formatDateRange } from "@/utils/dateFormat";

type Props = {
  application: Application;
};

const ApplicationCard = ({ application }: Props) => {
  const { t, i18n } = useTranslation();
  const isSwedish = i18n.language === "sv";
  const title = isSwedish ? application.title_sv : application.title_en;
  const dateRange = formatDateRange(application.term_start, application.term_end);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{title}</h3>
      </div>

      <div className={styles.cardText}>
        <p>
          {t("status")}: {t(application.status)}
        </p>

        <p>
          {t("termOfOffice")}: <br />
          {dateRange}
        </p>
      </div>

      <div className={styles.cardButton}>
        <button className={"smallButton"}>{t("viewApplication")}</button>
      </div>
    </div>
  );
};

export default ApplicationCard;
