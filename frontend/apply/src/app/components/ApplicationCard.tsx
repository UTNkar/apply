"use client";
import styles from "@/styles/card.module.css";
import positionCardStyles from "@/styles/positioncard.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { formatDateRange } from "@/utils/dateFormat";
import { Application } from "@/utils/types";
import { getImageUrl } from "@/utils/imageUrl";
import Image from "next/image";

type Props = {
  application: Application;
};

const ApplicationCard = ({ application }: Props) => {
  const { t } = useTranslation();
  const dateRange = formatDateRange(
    application.position_details.term_from,
    application.position_details.term_end,
  );

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
    <div className={`${styles.cardPadded} ${positionCardStyles.card}`}>
      {application.position_details.role.team_logo && (
        <Image
          src={getImageUrl(application.position_details.role.team_logo)}
          alt={t("teamLogoAlt")}
          height={80}
          width={80}
          className={styles.logoFloat}
        />
      )}

      <div className={styles.cardHeading}>
        <h3>{application.position_details.role.title}</h3>
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
        <a
          className={"smallButton"}
          href={`/apply/${application.position_details.id}`}
        >
          {t("viewApplication")}
        </a>
      </div>
    </div>
  );
};

export default ApplicationCard;
