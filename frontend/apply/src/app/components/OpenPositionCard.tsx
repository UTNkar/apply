"use client";
import styles from "@/styles/card.module.css";
import { useState } from "react";
import type { Position } from "@/utils/types";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { formatDate } from "@/utils/dateFormat";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageUrl";
import Link from "next/link";

type Props = {
  position: Position;
};

const OpenPositionCard = ({ position }: Props) => {
  const [showInfo, setShowInfo] = useState(false);
  const { t } = useTranslation();

  return (
    <div className={styles.card}>
      <div
        className={styles.cardClickable}
        onClick={() => setShowInfo(!showInfo)}
      >
        <div className={styles.logoContainer}>
          {position.role.team_logo && (
            <Image
              src={getImageUrl(position.role.team_logo)}
              alt={t("common.teamLogoAlt")}
              width={80}
              height={80}
            />
          )}
        </div>

        <div className={styles.cardLeftSection}>
          <h3>{position.role.title}</h3>
          {position.role.team_name}
        </div>

        <div className={styles.cardRightSection}>
          <h4>
            {t("openPositionCard.deadline")}: {formatDate(position.recruitment_end)}
          </h4>
          <Link
            className="smallButton"
            onClick={(e) => e.stopPropagation()}
            href={`/apply/${position.id}`}
          >
            {position.user_app_status === "Already applied"
              ? t("common.viewApplication")
              : position.user_app_status === "In draft"
                ? t("openPositionCard.openDraft")
                : t("common.apply")}
          </Link>
        </div>
      </div>

      <div
        className={`${styles.hiddenSection} ${
          showInfo ? styles.hiddenSectionVisible : ""
        }`}
      >
        <p>
          {t("common.termOfOffice")}: {formatDate(position.term_from)} -{" "}
          {formatDate(position.term_end)}
        </p>
        <p>
          {t("common.roleDescription")}: <br />
          {position.role.description}
        </p>

        {position.comment && (
          <p>
            {t("common.commentsForThisYear")}: <br />
            {position.comment}
          </p>
        )}
      </div>
    </div>
  );
};

export default OpenPositionCard;
