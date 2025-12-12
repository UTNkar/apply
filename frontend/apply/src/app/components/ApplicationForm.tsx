"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { applicationAPI } from "@/lib/api";
import type { Position, Application, Reference } from "@/lib/types";
import styles from "@/styles/application.module.css";

type ApplicationFormProps = {
  mode: "create" | "edit";
  position: Position;
  existingApplication?: Application;
};

type ReferenceErrors = {
  name?: string[];
  email_or_phone_num?: string[];
};

export default function ApplicationForm({
  mode,
  position,
  existingApplication,
}: ApplicationFormProps) {
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
    mode === "create" || existingApplication?.status === "draft";

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
    setSubmitting(true);
    setError(null);
    setReferenceErrors([]);

    try {
      if (mode === "create") {
        await applicationAPI.create({
          position: position.id,
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });
      } else if (existingApplication) {
        await applicationAPI.update(existingApplication.id, {
          cover_letter: coverLetter,
          qualifications,
          gdpr,
          status,
          references: references,
        });
      }

      router.push("/");
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        fieldErrors?: { references?: ReferenceErrors[] };
      };

      // Check for reference validation errors
      if (error.fieldErrors?.references) {
        setReferenceErrors(error.fieldErrors.references);
        setError("Please fix the validation errors in the reference fields");
      } else {
        setError(error.message || "Failed to submit application");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingApplication) return;
    if (!confirm("Are you sure you want to delete this draft application?"))
      return;

    setSubmitting(true);
    setError(null);

    try {
      await applicationAPI.delete(existingApplication.id);
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete application",
      );
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="pageContainer">
      <div className={styles.pageHeader}>
        <h2>{position.role.title}</h2>
      </div>

      <div className={styles.infoCard}>
        <p>
          <strong>Team:</strong> {position.role.team_name}
        </p>
        <p>
          <strong>Application Deadline:</strong>{" "}
          {formatDate(position.recruitment_end)}
        </p>
        <p>
          <strong>Term of office:</strong> {formatDate(position.term_from)} —{" "}
          {formatDate(position.term_end)}
        </p>

        {mode === "edit" && existingApplication && (
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={`${styles.statusBadge} ${existingApplication.status === "draft" ? styles.draft : styles.submitted}`}
            >
              {existingApplication.status}
            </span>
          </p>
        )}

        {position.role.description && (
          <>
            <p style={{ marginTop: "1rem" }}>
              <strong>Role Description:</strong>
            </p>
            <p>{position.role.description}</p>
          </>
        )}

        {position.comment && (
          <>
            <p style={{ marginTop: "1rem" }}>
              <strong>Comments for this year:</strong>
            </p>
            <p>{position.comment}</p>
          </>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <div className={styles.formSection}>
          <h2>Cover letter</h2>
          <label className={styles.formLabel}>
            Present yourself and state why you are who we are looking for
          </label>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Cover letter"
            rows={6}
            required
            disabled={!isEditable}
            className={styles.formTextarea}
          />
        </div>

        <div className={styles.formSection}>
          <h2>Qualifications</h2>
          <label className={styles.formLabel}>
            Give a summary of relevant qualifications
          </label>
          <textarea
            value={qualifications}
            onChange={(e) => setQualifications(e.target.value)}
            placeholder="Qualifications"
            rows={6}
            required
            disabled={!isEditable}
            className={styles.formTextarea}
          />
        </div>

        <div className={styles.formSection}>
          <h2>References</h2>

          {references.length === 0 && isEditable && (
            <p className={styles.formDescription}>Optional, max 3</p>
          )}

          {references.map((ref, index) => (
            <div key={index} className={styles.referenceCard}>
              <h4>Reference {index + 1}</h4>

              <div className={styles.formFieldRow}>
                <div className={styles.formFieldWithIcon}>
                  <label className={styles.formLabel}>Name</label>
                  <div style={{ position: "relative" }}>
                    <span className={styles.inputIcon}>
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={ref.name}
                      onChange={(e) =>
                        updateReference(index, "name", e.target.value)
                      }
                      placeholder="Bert Bertsson"
                      disabled={!isEditable}
                      className={styles.inputWithIcon}
                    />
                  </div>
                  {referenceErrors[index]?.name && (
                    <p className={styles.fieldError}>
                      {referenceErrors[index].name[0]}
                    </p>
                  )}
                </div>

                <div className={styles.formFieldWithIcon}>
                  <label className={styles.formLabel}>
                    Title/role e.g. Boss
                  </label>
                  <div style={{ position: "relative" }}>
                    <span className={styles.inputIcon}>
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={ref.title}
                      onChange={(e) =>
                        updateReference(index, "title", e.target.value)
                      }
                      placeholder="Boss"
                      disabled={!isEditable}
                      className={styles.inputWithIcon}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formFieldRow}>
                <div className={styles.formFieldWithIcon}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <div style={{ position: "relative" }}>
                    <span className={styles.inputIcon}>
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                      </svg>
                    </span>
                    <input
                      type="tel"
                      value={ref.phone_num}
                      onChange={(e) =>
                        updateReference(index, "phone_num", e.target.value)
                      }
                      placeholder="070-222 77 22"
                      disabled={!isEditable}
                      className={styles.inputWithIcon}
                    />
                  </div>
                  {referenceErrors[index]?.email_or_phone_num && (
                    <p className={styles.fieldError}>
                      {referenceErrors[index].email_or_phone_num![0]}
                    </p>
                  )}
                </div>

                <div className={styles.formFieldWithIcon}>
                  <label className={styles.formLabel}>Email</label>
                  <div style={{ position: "relative" }}>
                    <span className={styles.inputIcon}>
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      value={ref.email}
                      onChange={(e) =>
                        updateReference(index, "email", e.target.value)
                      }
                      placeholder="bert.bertsson@student.uu.se"
                      disabled={!isEditable}
                      className={styles.inputWithIcon}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Comment</label>
                <textarea
                  value={ref.comment}
                  onChange={(e) =>
                    updateReference(index, "comment", e.target.value)
                  }
                  placeholder="Additional comments"
                  rows={3}
                  disabled={!isEditable}
                  className={styles.formTextarea}
                />
              </div>

              {isEditable && (
                <div className={styles.removeButtonContainer}>
                  <button
                    type="button"
                    onClick={() => removeReference(index)}
                    className={styles.removeButton}
                  >
                    Remove Reference
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
              Add reference
            </button>
          )}
        </div>

        <div className={styles.formSection}>
          <h2>GDPR</h2>
          <div className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={gdpr}
              onChange={(e) => setGdpr(e.target.checked)}
              required
              disabled={!isEditable}
            />
            <span className={styles.checkboxLabel}>
              I accept that my data is saved in accordance with Uppsala Union of
              Engineering and Science Students integrity policy that can be
              found within the link:{" "}
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
                {submitting ? "Saving..." : "Save as draft"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit("submitted")}
                disabled={
                  submitting || !coverLetter || !qualifications || !gdpr
                }
                className={`button ${styles.submitButton}`}
              >
                {submitting ? "Submitting..." : "Apply"}
              </button>

              {mode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className={`button ${styles.deleteButton}`}
                >
                  Delete Draft
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/")}
              className={`button ${styles.backButton}`}
            >
              Back to Home
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
