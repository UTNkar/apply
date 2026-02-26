"use client";
import "@/i18n/config";
import Image from "next/image";
import styles from "@/styles/card.module.css";
import positionCardStyles from "@/styles/positioncard.module.css";
import type { Position } from "@/utils/types";
import { formatDateRange } from "@/utils/dateFormat";
import { getImageUrl } from "@/utils/imageUrl";
import { useTranslation } from "react-i18next";

type Props = {
  position: Position;
};

const MyPositionCard = ({ position }: Props) => {
  const { t } = useTranslation();
  const title = position.role.title;
  const dateRange = formatDateRange(position.term_from, position.term_end);

  return (
    <div className={`${styles.cardPadded} ${positionCardStyles.card}`}>
      {position.role.team_logo && (
        <Image
          src={getImageUrl(position.role.team_logo)}
          alt={t("teamLogoAlt")}
          height={80}
          width={80}
          className={styles.logoFloat}
        />
      )}
      <div className={styles.cardHeading}>
        <h3>{title}</h3>
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
