"use client";

import { useTranslation } from "react-i18next";
import styles from "@/styles/modal.module.css";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  title?: string;
  children: React.ReactNode;
  primaryButtonDisabled?: boolean;
  primaryButtonText: string;
  primaryButtonLoading?: boolean;
  secondaryButtonDisabled?: boolean;
  secondaryButtonText?: string;
  showSecondaryButton?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  onSubmit,
  title,
  children,
  primaryButtonDisabled,
  primaryButtonText,
  primaryButtonLoading = false,
  secondaryButtonDisabled,
  secondaryButtonText = "",
  showSecondaryButton = true,
}: ModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  if (secondaryButtonText === "") secondaryButtonText = t("common.cancel");

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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event);
          }}
          className={styles.modalForm}
        >
          {children}
          <div className={styles.modalActions}>
            {showSecondaryButton && (
              <Button
                onClick={onClose}
                disabled={secondaryButtonDisabled}
                secondaryButton
              >
                {secondaryButtonText}
              </Button>
            )}
            <Button
              type="submit"
              disabled={primaryButtonDisabled}
              loading={primaryButtonLoading}
            >
              {primaryButtonText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
