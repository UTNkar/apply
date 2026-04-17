"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { applicationAPI } from "@/utils/api";
import type { Position, Application, Reference } from "@/utils/types";
import styles from "@/styles/application.module.css";
import cardStyles from "@/styles/card.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import FormInput from "./FormInput";
import FormTextarea from "./FormTextarea";
import { formatDate } from "@/utils/dateFormat";
import Modal from "./Modal";

type ApplicationFormProps = {
  position: Position;
  existingApplication?: Application;
};

type ReferenceErrors = {
  name?: string[];
  email?: string[];
  phone_num?: string[];
};

export default function ApplicationForm({
  position,
  existingApplication,
}: ApplicationFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [deletingDraft, setDeletingDraft] = useState(false);
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDraft, setIsDraft] = useState(
    existingApplication?.status === "draft",
  );
  const [showDraftSavedMessage, setShowDraftSavedMessage] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(
    existingApplication?.id ?? null,
  );
  const [editable, setEditable] = useState(!existingApplication || isDraft);

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
    if (status === "draft") {
      setSavingDraft(true);
    } else {
      setSubmittingApplication(true);
    }

    setError(null);
    setReferenceErrors([]);
    setShowDraftSavedMessage(false);

    try {
      if (!isDraft) {
        // Create new application
        const createdApplication = await applicationAPI.create({
          position: position.id,
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });

        if (status === "draft") {
          // Enter draft mode
          setIsDraft(true);
          setDraftId(createdApplication.id);
        }
      } else if (draftId !== null) {
        // Edit existing application draft
        await applicationAPI.update(draftId, {
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });
      }

      if (status === "submitted") {
        setSubmitSuccess(true);
        setEditable(false);
      } else {
        setShowDraftSavedMessage(true);
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
      if (status === "draft") {
        setSavingDraft(false);
      } else {
        setSubmittingApplication(false);
      }
    }
  };

  const openDeleteModal = async () => {
    if (!isDraft) return;
    setShowDeleteModal(true);
  };

  const handleDeleteDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Deleting draft with ID:", draftId);
    if (!isDraft || draftId === null) return;
    setDeletingDraft(true);
    setError(null);

    try {
      await applicationAPI.delete(draftId);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("failedToDeleteApplication"),
      );
      setShowDeleteModal(false);
    } finally {
      setDeletingDraft(false);
    }
  };

  return (
    <div className="pageContainer">
      <div className={styles.pageHeader}>
        <h2>{position.role.title}</h2>
      </div>

      <div className={cardStyles.cardDark}>
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

        {isDraft && (
          <p>
            <strong>{t("status")}:</strong>{" "}
            <span
              className={`${styles.statusBadge} ${isDraft ? styles.draft : styles.submitted}`}
            >
              {t(isDraft ? "draft" : "submitted")}
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
        <div className={cardStyles.cardSection}>
          <h2>{t("coverLetterTitle")}</h2>
          <FormTextarea
            label={t("coverLetterPrompt")}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={6}
            required
            disabled={!editable}
          />
        </div>

        <div className={cardStyles.cardSection}>
          <h2>{t("qualificationsTitle")}</h2>
          <FormTextarea
            label={t("qualificationsPrompt")}
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            rows={6}
            required
            disabled={!editable}
          />
        </div>

        <div className={cardStyles.cardSection}>
          <h2>{t("referencesTitle")}</h2>

          {references.length === 0 && editable && (
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
                  value={ref.name ?? ""}
                  onChange={(e) =>
                    updateReference(index, "name", e.target.value)
                  }
                  disabled={!editable}
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
                  value={ref.title ?? ""}
                  onChange={(e) =>
                    updateReference(index, "title", e.target.value)
                  }
                  disabled={!editable}
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
                  value={ref.phone_num ?? ""}
                  onChange={(e) =>
                    updateReference(index, "phone_num", e.target.value)
                  }
                  disabled={!editable}
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
                  value={ref.email ?? ""}
                  onChange={(e) =>
                    updateReference(index, "email", e.target.value)
                  }
                  disabled={!editable}
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
                value={ref.comment ?? ""}
                onChange={(e) =>
                  updateReference(index, "comment", e.target.value)
                }
                rows={3}
                disabled={!editable}
              />

              {editable && (
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

          {editable && references.length < 3 && (
            <button
              type="button"
              onClick={addReference}
              className={`button ${styles.addReferenceButton}`}
            >
              {t("addReference")}
            </button>
          )}
        </div>

        <div className={cardStyles.cardSection}>
          <h2>{t("gdprTitle")}</h2>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={gdpr}
              onChange={(e) => setGdpr(e.target.checked)}
              required
              disabled={!editable}
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
          {editable ? (
            <>
              <div className={styles.draftSaveGroup}>
                <button
                  type="button"
                  onClick={() => handleSubmit("draft")}
                  disabled={
                    savingDraft ||
                    submittingApplication ||
                    deletingDraft ||
                    !coverLetter ||
                    !qualifications ||
                    !gdpr
                  }
                  className={`button ${styles.draftButton}`}
                >
                  {savingDraft ? t("saving") : t("saveDraft")}
                </button>

                {showDraftSavedMessage && (
                  <p className={styles.draftSavedMessage}>
                    <Image
                      src="/icons/check-blue.svg"
                      alt=""
                      width={16}
                      height={16}
                      className={styles.draftSavedIcon}
                    />
                    {t("draftSaved")}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmitSuccess(false);
                  setShowSubmitModal(true);
                }}
                disabled={
                  savingDraft ||
                  submittingApplication ||
                  deletingDraft ||
                  !coverLetter ||
                  !qualifications ||
                  !gdpr
                }
                className={`button ${styles.submitButton}`}
              >
                {submittingApplication ? t("submitting") : t("apply")}
              </button>

              {isDraft && (
                <button
                  type="button"
                  onClick={openDeleteModal}
                  disabled={savingDraft || submittingApplication || deletingDraft}
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("deleteDraft")}
        primaryButtonText={t("delete")}
        onSubmit={handleDeleteDraft}
      >
        <p>{t("deleteDraftConfirmation")}</p>
      </Modal>

      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title={submitSuccess ? t("submitted") : t("submitApplication")}
        primaryButtonText={submitSuccess ? t("backToHome") : t("submit")}
        onSubmit={() => {
          if (submitSuccess) {
            router.push("/");
            return;
          }

          handleSubmit("submitted");
        }}
        primaryButtonDisabled={submittingApplication}
        secondaryButtonDisabled={submittingApplication}
        showSecondaryButton={!submitSuccess}
      >
        <p>
          {submitSuccess
            ? t("applicationSubmittedSuccess")
            : t("submitApplicationConfirmation")}
        </p>
      </Modal>
    </div>
  );
}
