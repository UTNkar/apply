"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applicationAPI } from "@/lib/api";
import type { Position, Application, Reference } from "@/lib/types";
import styles from "@/styles/application.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import FormInput from "./FormInput";
import FormTextarea from "./FormTextarea";
import { formatDate } from "@/utils/dateFormat";

type ApplicationFormProps = {
  position: Position;
  existingApplication?: Application;
};

type ReferenceErrors = {
  email?: string;
  phone_num?: string;
};

export default function ApplicationForm({
  position,
  existingApplication,
}: ApplicationFormProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceErrors, setReferenceErrors] = useState<ReferenceErrors[]>([]);
  const [coverLetter, setCoverLetter] = useState(
    existingApplication?.cover_letter || "",
  );
  const [qualifications, setQualifications] = useState(
    existingApplication?.qualifications || "",
  );
  const [gdpr, setGdpr] = useState(existingApplication?.gdpr || false);
  const [references, setReferences] = useState<Reference[]>([]);

  const isEditable =
    !existingApplication || existingApplication?.status === "draft";

  // Load existing references when editing
  useEffect(() => {
    if (
      existingApplication?.references &&
      existingApplication.references.length > 0
    ) {
      setReferences(existingApplication.references);
    }
  }, [existingApplication]);

  const addReference = () => {
    if (references.length < 3) {
      setReferences([
        ...references,
        { name: "", phone_num: "", email: "", comment: "", title: "" },
      ]);
    }
  };

  const removeReference = (index: number) => {
    setReferences(references.filter((_, i) => i !== index));
    setReferenceErrors(referenceErrors.filter((_, i) => i !== index));
  };

  const updateReference = (
    index: number,
    field: keyof Reference,
    value: string,
  ) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    setReferences(updated);
  };

  const handleSubmit = async (status: "draft" | "submitted") => {
    if (
      status === "submitted" &&
      !window.confirm(t("confirmSubmitApplication"))
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setReferenceErrors([]);

    try {
      if (!existingApplication) {
        // Create new application
        await applicationAPI.create({
          position: position.id,
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });
      } else {
        // Edit existing application draft
        await applicationAPI.update(existingApplication.id, {
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });
      }

      if (status === "submitted") {
        router.push("/");
      }
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        fieldErrors?: { references?: ReferenceErrors[] };
        non_field_errors?: string[];
      };

      if (error.non_field_errors) {
        setError(error.non_field_errors.join(" "));
      } else if (error.fieldErrors?.references) {
        setReferenceErrors(error.fieldErrors.references);
        setError(t("validationErrorsInReferences"));
      } else {
        setError(error.message || t("failedToSubmitApplication"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingApplication) return;
    if (!confirm(t("confirmDeleteDraft"))) return;

    setSubmitting(true);
    setError(null);

    try {
      await applicationAPI.delete(existingApplication.id);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("failedToDeleteApplication"),
      );
      setSubmitting(false);
    }
  };


  return (
    <div className="pageContainer">
      <div className={styles.pageHeader}>
        <h2>{position.role.title}</h2>
      </div>

      <div className={styles.infoCard}>
        <p>
          <strong>{t("teamLabel")}:</strong> {position.role.team_name}
        </p>
        <p>
          <strong>{t("applicationDeadline")}:</strong>{" "}
          {formatDate(position.recruitment_end)}
        </p>
        <p>
          <strong>{t("termOfOffice")}:</strong> {formatDate(position.term_from)}{" "}
          — {formatDate(position.term_end)}
        </p>

        {existingApplication && (
          <p>
            <strong>{t("status")}:</strong>{" "}
            <span
              className={`${styles.statusBadge} ${existingApplication.status === "draft" ? styles.draft : styles.submitted}`}
            >
              {t(existingApplication.status)}
            </span>
          </p>
        )}

        {position.role.description && (
          <>
            <p style={{ marginTop: "1rem" }}>
              <strong>{t("roleDescription")}:</strong>
            </p>
            <p>{position.role.description}</p>
          </>
        )}

        {position.comment && (
          <>
            <p style={{ marginTop: "1rem" }}>
              <strong>{t("commentsForThisYear")}:</strong>
            </p>
            <p>{position.comment}</p>
          </>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formSection}>
          <h2>{t("coverLetterTitle")}</h2>
          <FormTextarea
            label={t("coverLetterPrompt")}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            required
            disabled={!isEditable}
          />
        </div>

        <div className={styles.formSection}>
          <h2>{t("qualificationsTitle")}</h2>
          <FormTextarea
            label={t("qualificationsPrompt")}
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            rows={6}
            required
            disabled={!isEditable}
          />
        </div>

        <div className={styles.formSection}>
          <h2>{t("referencesTitle")}</h2>

          {references.length === 0 && isEditable && (
            <p className={styles.formDescription}>
              {t("referencesOptionalMax")}
            </p>
          )}

          {references.map((ref, index) => (
            <div key={index} className={styles.referenceCard}>
              <h4>{`${t("referenceLabel")} ${index + 1}`}</h4>

              <div className={styles.formFieldRow}>
                <FormInput
                  label={t("name")}
                  type="text"
                  value={ref.name}
                  onChange={(e) =>
                    updateReference(index, "name", e.target.value)
                  }
                  disabled={!isEditable}
                  error={referenceErrors[index]?.name?.[0]}
                  icon={
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  }
                />

                <FormInput
                  label={t("titleRoleLabel")}
                  type="text"
                  value={ref.title}
                  onChange={(e) =>
                    updateReference(index, "title", e.target.value)
                  }
                  disabled={!isEditable}
                  icon={
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                    </svg>
                  }
                />
              </div>

              <div className={styles.formFieldRow}>
                <FormInput
                  label={t("phoneNumber")}
                  type="tel"
                  value={ref.phone_num}
                  onChange={(e) =>
                    updateReference(index, "phone_num", e.target.value)
                  }
                  disabled={!isEditable}
                  error={referenceErrors[index]?.phone_num?.[0]}
                  icon={
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                  }
                />

                <FormInput
                  label={t("email")}
                  type="email"
                  value={ref.email}
                  onChange={(e) =>
                    updateReference(index, "email", e.target.value)
                  }
                  disabled={!isEditable}
                  error={referenceErrors[index]?.email?.[0]}
                  icon={
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  }
                />
              </div>

              <FormTextarea
                label={t("commentLabel")}
                value={ref.comment}
                onChange={(e) =>
                  updateReference(index, "comment", e.target.value)
                }
                rows={3}
                disabled={!isEditable}
              />

              {isEditable && (
                <div className={styles.removeButtonContainer}>
                  <button
                    type="button"
                    onClick={() => removeReference(index)}
                    className={styles.removeButton}
                  >
                    {t("removeReference")}
                  </button>
                </div>
              )}
            </div>
          ))}

          {isEditable && references.length < 3 && (
            <button
              type="button"
              onClick={addReference}
              className={`button ${styles.addReferenceButton}`}
            >
              {t("addReference")}
            </button>
          )}
        </div>

        <div className={styles.formSection}>
          <h2>{t("gdprTitle")}</h2>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={gdpr}
              onChange={(e) => setGdpr(e.target.checked)}
              required
              disabled={!isEditable}
            />
            <span className={styles.checkboxLabel}>
              {t("gdprConsentText")}{" "}
              <a
                href="https://utn.se/dokumentarkiv"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://utn.se/dokumentarkiv
              </a>
            </span>
          </div>
        </div>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <div className={styles.actionButtons}>
          {isEditable ? (
            <>
              <button
                type="button"
                onClick={() => handleSubmit("draft")}
                disabled={
                  submitting || !coverLetter || !qualifications || !gdpr
                }
                className={`button ${styles.draftButton}`}
              >
                {submitting ? t("saving") : t("saveDraft")}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit("submitted")}
                disabled={
                  submitting || !coverLetter || !qualifications || !gdpr
                }
                className={`button ${styles.submitButton}`}
              >
                {submitting ? t("submitting") : t("apply")}
              </button>

              {existingApplication &&
                existingApplication.status === "draft" && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting}
                    className={`button ${styles.deleteButton}`}
                  >
                    {t("deleteDraft")}
                  </button>
                )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/")}
              className={`button ${styles.backButton}`}
            >
              {t("backToHome")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
