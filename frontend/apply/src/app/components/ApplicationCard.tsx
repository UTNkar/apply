"use client";
import { useRouter } from "next/navigation";
import styles from "@/styles/applicationcard.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import type { Application } from "@/types/position";
import { formatDateRange } from "@/utils/dateFormat";

type Props = {
  application: Application;
};

const ApplicationCard = ({ application }: Props) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dateRange = formatDateRange(application.termStart, application.termEnd);

  const status = t(
    {
      draft: "draft",
      submitted: "submitted",
      approved: "approved",
      disapproved: "disapproved",
      appointed: "appointed",
      turned_down: "turnedDown",
    }[application.status] || application.status,
  );

  return (
    <div className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{application.title}</h3>
      </div>

      <div className={styles.cardText}>
        <p>
          {t("status")}: {status}
        </p>

        <p>
          {t("termOfOffice")}: <br />
          {dateRange}
        </p>
      </div>

      <div className={styles.cardButton}>
        <a className={"smallButton"} href={`/apply/${application.id}`}>
          {t("viewApplication")}
        </a>
      </div>
    </div>
  );
};

export default ApplicationCard;
