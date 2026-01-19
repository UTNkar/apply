'use client'
import styles from '@/styles/openpositioncard.module.css'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Position } from '@/lib/types'
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { formatDate, formatDateRange } from "@/utils/dateFormat";

type Props = {
  position: Position
}

const OpenPositionCard = ({ position }: Props) => {
  const router = useRouter()
  const [showInfo, setShowInfo] = useState(false)
  const { t, i18n } = useTranslation();
  const isSwedish = i18n.language === "sv";


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className={styles.cardContainer}>
      <div
        className={styles.cardInitial}
        onClick={() => setShowInfo(!showInfo)}
      >
        <div className={styles.cardLogo}>
          {position.role.team_logo && (
            <img src={position.role.team_logo} alt="Team logo" />
          )}
        </div>

        <div className={styles.cardLeftSection}>
          <h3>{position.role.title}</h3>
          {position.role.team_name}
        </div>

        <div className={styles.cardRightSection}>
          <h4>{t("deadline")}: {formatDate(position.recruitment_end)}</h4>
            <button
              type="button"
              className={`button ${styles.applyButton}`}
              disabled={position.user_app_status !== ""}
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/apply/${position.id}`)
              }}
            >
              {position.user_app_status || {t("apply")}}
            </button>
        </div>
      </div>

      <div
        className={`${styles.hiddenSection} ${
          showInfo ? styles.hiddenSectionVisible : ""
        }`}
      >
        <p>
          {t("termOfOffice")}: {formatDate(position.term_from)} - {formatDate(position.term_end)}
        </p>
        <p>
          {t("roleDescription")}: <br />
          {position.role.description}
        </p>

        {position.comment && (
          <p>
            Comments for this year: <br />
            {position.comment}
          </p>
        )}
      </div>
    </div>
  );
};

export default OpenPositionCard;
