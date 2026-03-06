"use client";

import { useTranslation } from "react-i18next";
import styles from "@/styles/modal.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title?: string;
  children: React.ReactNode;
  primaryButtonDisabled?: boolean;
  primaryButtonText: string;
  secondaryButtonDisabled?: boolean;
  secondaryButtonText?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  primaryButtonDisabled,
  primaryButtonText,
  secondaryButtonDisabled,
  secondaryButtonText = "",
}: ModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  if (secondaryButtonText === "") secondaryButtonText = t("cancel");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
        {title && (
          <div className={styles.modalHeader}>
            <h3>{title}</h3>
          </div>
        )}

        <form onSubmit={onSubmit} className={styles.modalForm}>
          {children}
          <div className={styles.modalActions}>
            <button
              type="button"
              className="button"
              onClick={onClose}
              disabled={secondaryButtonDisabled}
            >
              {secondaryButtonText}
            </button>
            <button
              type="submit"
              className="button activeButton"
              disabled={primaryButtonDisabled}
            >
              {primaryButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
