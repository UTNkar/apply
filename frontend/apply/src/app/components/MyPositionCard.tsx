"use client";
import "@/i18n/config";
import Image from "next/image";
import styles from "@/styles/mypositioncard.module.css";
import type { Role } from "@/types/position";
import { formatDateRange } from "@/utils/dateFormat";
import { getImageUrl } from "@/utils/imageUrl";
import { useTranslation } from "react-i18next";

type Props = {
  position: {
    id: string;
    termEnd: string;
    termStart: string;
    role: Role;
  };
};

const MyPositionCard = ({ position }: Props) => {
  const { t } = useTranslation();
  const title = position.role.title;
  const dateRange = formatDateRange(position.termStart, position.termEnd);

  return (
    <div className={styles.card}>
      <Image
        src={getImageUrl(position.role.team_logo)}
        alt={t("teamLogoAlt")}
        height={80}
        width={80}
        className={styles.logo}
      />
      <div className={styles.cardHeading}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
      </div>

      <div className={styles.cardText}>
        <p>
          {t("termOfOffice")}: <br />
          {dateRange}
        </p>
      </div>
    </div>
  );
};

export default MyPositionCard;
