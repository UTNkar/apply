/*
Todo:
- Add logo from model
*/

"use client";
import styles from "@/styles/mypositioncard.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import type { Position } from "@/types/position";
import { formatDateRange } from "@/utils/dateFormat";

type Props = {
  position: Position;
};

const MyPositionCard = ({ position }: Props) => {
  const { t, i18n } = useTranslation();
  const isSwedish = i18n.language === "sv";
  const title = isSwedish ? position.role.title_sv : position.role.title_en;
  const dateRange = formatDateRange(position.term_start, position.term_end);

  return (
    <div className={styles.card}>
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
