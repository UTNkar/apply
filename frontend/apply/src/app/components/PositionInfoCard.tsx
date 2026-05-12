import type { Position } from "@/utils/types";
import styles from "@/styles/application.module.css";
import cardStyles from "@/styles/card.module.css";
import { useTranslation } from "react-i18next";
import { formatDate } from "@/utils/dateFormat";

type PositionInfoCardProps = {
  position: Position;
  showDraftStatus?: boolean;
};

export default function PositionInfoCard({
  position,
  showDraftStatus = false,
}: PositionInfoCardProps) {
  const { t } = useTranslation();

  const getDeadlineSuffix = (dateString: string) => {
    const deadline = new Date(dateString);
    if (isNaN(deadline.getTime())) return "";

    const now = new Date();
    const toDayNumber = (date: Date) =>
      Math.floor(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
          (24 * 60 * 60 * 1000),
      );

    const daysUntilDeadline =
      toDayNumber(deadline) - toDayNumber(now);

    if (daysUntilDeadline === 0) {
      return `(${t("applicationForm.deadlineToday")})`;
    }

    if (daysUntilDeadline > 0) {
      return `(${t("applicationForm.applicationDeadlineInDays", { count: daysUntilDeadline })})`;
    }

    return "";
  };

  const deadlineSuffix = getDeadlineSuffix(position.recruitment_end);

  return (
    <div className={cardStyles.cardDark}>
      <p>
        <strong>{t("applicationForm.teamLabel")}:</strong> {position.role.team_name}
      </p>
      <p>
        <strong>{t("applicationForm.applicationDeadline")}:</strong>{" "}
        {formatDate(position.recruitment_end)} {deadlineSuffix}
      </p>
      <p>
        <strong>{t("common.termOfOffice")}:</strong> {formatDate(position.term_from)} —{" "}
        {formatDate(position.term_end)}
      </p>

      {position.role.contact_email && (
        <p>
          <strong>{t("applicationForm.contactEmail")}:</strong>{" "}
          <a href={`mailto:${position.role.contact_email}`}>
            {position.role.contact_email}
          </a>
        </p>
      )}

      {position.role.description && (
        <>
          <p>
            <strong>{t("common.roleDescription")}:</strong>
          </p>
          <p style={{ whiteSpace: "pre-line" }}>{position.role.description}</p>
        </>
      )}

      {position.role.role_description_url && (
        <p>
          <a
            href={position.role.role_description_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("applicationForm.viewRoleDescription")}
          </a>
        </p>
      )}

      {position.comment && (
        <>
          <p>
            <strong>{t("common.commentsForThisYear")}:</strong>
          </p>
          <p style={{ whiteSpace: "pre-line" }}>{position.comment}</p>
        </>
      )}

      {showDraftStatus && (
        <p>
          <strong>{t("common.status")}:</strong>{" "}
          <span className={`${styles.statusBadge} ${styles.draft}`}>
            {t("applicationStatus.draft")}
          </span>
        </p>
      )}
    </div>
  );
}