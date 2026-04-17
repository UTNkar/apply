"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import TextInput from "../components/TextInput";
import styles from "@/styles/account.module.css";
import cardStyles from "@/styles/card.module.css";
import Person from "@/icons/person.jsx";
import Number from "@/icons/number.jsx";
import Mail from "@/icons/mail.jsx";
import Phone from "@/icons/phone.jsx";
import Section from "@/icons/section.jsx";
import StudentHat from "@/icons/student-hat.jsx";
import { request, Method } from "@/utils/request";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import Button from "@/components/Button";
import { formatDate } from "@/utils/dateFormat";
import Modal from "@/components/Modal";
import modalStyles from "@/styles/modal.module.css";

interface Program {
  id: string;
  name_en: string;
  name_sv: string;
  name: string;
  value: string;
}

interface Section {
  id: string;
  abbreviation: string;
  section_en: string;
  section_sv: string;
  name: string;
  value: string;
  programs: Array<Program>;
}

interface AccountStudyProgram {
  id: number | string;
  name_en: string;
  name_sv: string;
  section: {
    id: number | string;
    abbreviation: string;
    section_en: string;
    section_sv: string;
  };
}

interface AccountResponse {
  ssn: string;
  email: string;
  name: string;
  phone_number: string;
  registration_year: number | string;
  study_program: AccountStudyProgram | null;
}

interface FormState {
  ssn: string;
  email: string;
  name: string;
  phone_number: string;
  registration_year: number;
  study_program: { id: string; section: string } | null;
  section: string;
  program: string;
}

type Errors = {
  [key in keyof FormState]?: string;
};

export default function Account() {
  const { t, i18n } = useTranslation();
  const default_state = {
    ssn: "",
    email: "",
    name: "",
    phone_number: "",
    registration_year: 0,
    study_program: null,
    section: "",
    program: "",
  } as FormState;
  const [state, setState] = useState<FormState>(default_state);
  const [originalState, setOriginalState] = useState<FormState>(default_state);
  const [errors, setErrors] = useState<Errors>({});
  const [intermediateErrors, setIntermediateErrors] = useState<Errors>({});
  const [sections, setSections] = useState<Array<Section>>([]);
  const [unicoreLoading, setUnicoreLoading] = useState<boolean>(false);
  const [memberSince, setMemberSince] = useState<string>("");

  const [isPasswordModalOpen, setIsPasswordModalOpen] =
    useState<boolean>(false);
  const [passwordError, setPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const passwordSpecialCharRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

  const validateNewPassword = (password: string) => {
    if (password.length < 10) {
      return t("accountPage.passwordTooShort");
    }

    if (!/[0-9]/.test(password)) {
      return t("accountPage.passwordMustContainNumber");
    }

    if (!passwordSpecialCharRegex.test(password)) {
      return t("accountPage.passwordMustContainSpecialCharacter");
    }

    return "";
  };

  const handleNewPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const password = e.target.value;

    if (password.length === 0) {
      setNewPasswordError("");
      return;
    }

    setNewPasswordError(validateNewPassword(password));
  };

  const handlePasswordModalClose = () => {
    setPasswordError("");
    setNewPasswordError("");
    setPasswordSuccess(false);
    setIsPasswordModalOpen(false);
  };

  const handleDeleteModalClose = () => {
    if (deleteLoading) return;
    setDeleteError("");
    setIsDeleteModalOpen(false);
  };

  const handleDeleteAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDeleteError("");
    setDeleteLoading(true);

    try {
      const response = await request(Method.DELETE, "/account/");
      if (response.ok) {
        window.location.href = "/login";
        return;
      }

      setDeleteError(t("accountPage.accountDeleteError"));
    } catch {
      setDeleteError(t("accountPage.accountDeleteError"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setPasswordError(t("accountPage.passwordsDoNotMatch"));
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(t("accountPage.passwordCannotBeSame"));
      return;
    }

    const passwordValidationError = validateNewPassword(newPassword);
    if (passwordValidationError) {
      setNewPasswordError(passwordValidationError);
      return;
    }
    setNewPasswordError("");

    setPasswordLoading(true);

    try {
      const response = await request(Method.POST, "/auth/change-password", {
        old_password: currentPassword,
        new_password: newPassword,
      });

      if (response.ok) {
        setPasswordSuccess(true);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
      } else {
        setPasswordError(t("accountPage.passwordChangeError"));
      }
    } catch {
      setPasswordError(t("accountPage.passwordChangeError"));
    } finally {
      setPasswordLoading(false);
    }
  };

  const setProgramNames = useCallback(() => {
    const isSwedish = i18n.language === "sv";
    setSections((prev: Array<Section>) =>
      prev.map((section: Section) => {
        return {
          ...section,
          name: isSwedish ? section.section_sv : section.section_en,
          programs: section.programs.map((program) => ({
            ...program,
            name: isSwedish ? program.name_sv : program.name_en,
          })),
        };
      }),
    );
  }, [i18n.language]);

  const handleNewUserData = (data: AccountResponse) => {
    const programId = data.study_program?.id
      ? String(data.study_program.id)
      : "";
    const sectionId = data.study_program?.section?.id
      ? String(data.study_program.section.id)
      : "";
    const normalizedStudyProgram = data.study_program
      ? { id: programId, section: sectionId }
      : null;
    const registrationYear = parseInt(String(data.registration_year), 10) || 0;

    setState((prevState: FormState) => ({
      ...prevState,
      ssn: data.ssn,
      email: data.email,
      name: data.name,
      phone_number: data.phone_number,
      registration_year: registrationYear,
      study_program: normalizedStudyProgram,
      section: sectionId,
      program: programId,
    }));
    setOriginalState((prevState: FormState) => ({
      ...prevState,
      ssn: data.ssn,
      email: data.email,
      name: data.name,
      phone_number: data.phone_number,
      registration_year: registrationYear,
      study_program: normalizedStudyProgram,
      section: sectionId,
      program: programId,
    }));
  };

  useEffect(() => {
    const normalizeSections = (data: Section[]): Section[] => {
      return data.map((section) => ({
        ...section,
        id: section.id,
        value: section.id,
        name: i18n.language === "sv" ? section.section_sv : section.section_en,
        programs: section.programs.map((program) => ({
          ...program,
          id: program.id,
          value: program.id,
          name: i18n.language === "sv" ? program.name_sv : program.name_en,
        })),
      }));
    };

    // Fetch sections and programs
    request(Method.GET, "/sections/").then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as Section[];
        setSections(normalizeSections(data));
      } else {
        const err = await res.text();
        console.error("Failed to fetch sections");
        console.error(err);
      }
    });
    // Fetch user account data
    request(Method.GET, "/account/").then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as AccountResponse;
        handleNewUserData(data);
      } else {
        const err = await res.text();
        console.error("Failed to fetch account data");
        console.error(err);
      }
    });
    // Fetch membership status and join date
    request(Method.GET, "/membership/").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setMemberSince(data);
      } else {
        const err = await res.text();
        console.error("Failed to fetch membership data");
        console.error(err);
      }
    });
  }, [setProgramNames, i18n.language]);

  useEffect(() => {
    if (sections.length > 0) {
      setProgramNames();
    }
  }, [i18n.language, setProgramNames, sections.length]);

  const useDebounce = <T,>(value: T, delay: number): T => {
    const [debounceValue, setDebounceValue] = useState<T>(value);
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebounceValue(value);
      }, delay);
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
    return debounceValue;
  };
  const debouncedErrors = useDebounce(intermediateErrors, 800);
  useEffect(() => setErrors(debouncedErrors), [debouncedErrors]);

  const onError = (name: keyof FormState, error: string) => {
    setIntermediateErrors((prevErrors: Errors) => ({
      ...prevErrors,
      [name]: error,
    }));
  };

  const clearError = (name: keyof FormState) => {
    setErrors((prevErrors: Errors) => ({
      ...prevErrors,
      [name]: "",
    }));
    setIntermediateErrors((prevErrors: Errors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const validateInput = (
    name: keyof FormState,
    value: string,
    target: HTMLInputElement | HTMLSelectElement,
  ) => {
    // Validate required fields
    const required = target.required;
    if (required && value.length === 0) {
      // Get field label, e.g. "Email"
      const labelElement = target.parentNode?.querySelector(".label");
      const label =
        labelElement instanceof HTMLElement
          ? labelElement.innerText
          : t("accountPage.thisField");
      onError(name, label + " " + t("accountPage.isRequired"));
      return;
    }

    // Validate formats
    switch (name) {
      case "email":
        // Validate email format (very permissive)
        const email_re = /^.*@.*$/;
        if (value.match(email_re) === null) {
          onError("email", t("accountPage.invalidEmailFormat"));
        }
        break;
      case "phone_number":
        // https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
        const phone_re =
          /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
        if (value.match(phone_re) === null) {
          onError("phone_number", t("accountPage.invalidPhoneFormat"));
        }
        break;
    }
  };

  const onChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const value = event.target.value;
    const name = event.target.name as keyof FormState;
    setState((prevState: FormState) => ({
      ...prevState,
      [name]: value,
    }));
    if (name === "section") {
      // Make sure the first program in the dropdown is selected. Otherwise,
      // state.program and the shown program in the dropdown won't match.
      const program = sections.find((section) => section.id == value)
        ?.programs[0]?.id;
      if (program) {
        setState((prevState: FormState) => ({
          ...prevState,
          program: program,
        }));
      }
    }
    clearError(name);
    validateInput(name, value, event.target);
  };

  const resetForm = () => {
    setState(originalState);
    setErrors({});
    setIntermediateErrors({});
  };

  const formHasErrors = Object.values(intermediateErrors).some(
    (error) => error !== "",
  );

  const submitForm = () => {
    if (formHasErrors) {
      // Normally unreachable since the button should be disabled, but just in case
      alert(t("accountPage.formHasErrors"));
      return;
    }

    setShowSaveMessage(false);

    const payload = { ...state, study_program: state.program };
    request(Method.POST, "/account/", payload).then((resp) => {
      if (!resp.ok) {
        resp.json().then((err) => {
          setErrors(err);
          console.error(err);
        });
      } else {
        resp.json().then((data) => {
          handleNewUserData(data.user);
          setShowSaveMessage(true);
          setTimeout(() => setShowSaveMessage(false), 3000);
        });
      }
    });
  };

  const update_info_from_unicore = () => {
    setUnicoreLoading(true);
    request(Method.POST, "/update-unicore/", { ssn: state.ssn }).then(
      (resp) => {
        if (!resp.ok) {
          resp.text().then((err) => {
            console.error(err);
            setTimeout(() => {
              setUnicoreLoading(false);
            }, 500);
          });
        } else {
          resp.json().then((data) => {
            console.log("Unicore data updated:", data);
            handleNewUserData(data);
            setTimeout(() => {
              setUnicoreLoading(false);
            }, 500);
          });
        }
      },
    );
  };

  const programs_in_section =
    sections
      .find((s) => s.id == state.section)
      ?.programs.map((p) => ({ value: p.id, name: p.name })) || [];

  const no_programs = {
    value: "N/A",
    name: t("accountPage.selectSectionFirst"),
  };

  const membershipText = (memberSince: string) => {
    if (memberSince === "Not a member") {
      return t("accountPage.notMemberInfo");
    }
    if (memberSince === "Member") {
      return t("accountPage.isMemberInfo");
    }
    if (memberSince.length === 0) {
      return t("accountPage.loadingMembershipInfo");
    }
    return `${t("accountPage.memberSince")} ${formatDate(memberSince)}.`;
  };

  return (
    <div className="pageContainer">
      <h2>{t("accountPage.accountTitle")}</h2>

      <div className={cardStyles.cardSection}>
        <h3>{t("accountPage.contactInformation")}</h3>

        <div className={styles.formRow}>
          <TextInput
            label={t("common.name")}
            value={state.name}
            onChange={onChange}
            name="name"
            icon={<Person />}
            disabled
          />
          <TextInput
            label={t("accountPage.personalIdentityNumber")}
            value={state.ssn}
            onChange={onChange}
            name="ssn"
            placeholder="yyyymmdd-xxxx"
            icon={<Number />}
            disabled
          />
        </div>
        <p>{t("accountPage.memberRegistryInfo")}</p>

        <Button
          onClick={update_info_from_unicore}
          style={{ marginBottom: 24 }}
          disabled={unicoreLoading}
          loading={unicoreLoading}
        >
          {t("accountPage.updateInformation")}
        </Button>

        <div className={styles.formRow}>
          <TextInput
            required
            label={t("common.phoneNumber")}
            value={state.phone_number}
            onChange={onChange}
            name="phone_number"
            icon={<Phone />}
            type="text"
            error={errors.phone_number}
          />
          <TextInput
            required
            label={t("common.email")}
            value={state.email}
            onChange={onChange}
            name="email"
            icon={<Mail />}
            error={errors.email}
          />
        </div>
      </div>

      <div className={cardStyles.cardSection}>
        <h3>{t("accountPage.membershipStatus")}</h3>
        <p>{membershipText(memberSince)}</p>
      </div>

      <div className={cardStyles.cardSection}>
        <h3>{t("accountPage.accountSecurity")}</h3>
        <p>{t("accountPage.changePasswordDescription")}</p>
        <Button
          onClick={() => setIsPasswordModalOpen(true)}
          style={{ margin: "12px 0px" }}
        >
          {t("accountPage.changePassword")}
        </Button>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordModalClose}
        onSubmit={handlePasswordSubmit}
        title={t("accountPage.changePassword")}
        primaryButtonDisabled={passwordLoading}
        primaryButtonText={passwordLoading ? t("common.saving") : t("accountPage.changePassword")}
        secondaryButtonDisabled={passwordLoading}
      >
        {passwordSuccess ? (
          <div className={modalStyles.successMessage}>
            {t("accountPage.passwordChanged")}
          </div>
        ) : (
          <>
            <div className={modalStyles.formGroup}>
              <label htmlFor="currentPassword">{t("accountPage.currentPassword")}</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label htmlFor="newPassword">{t("accountPage.newPassword")}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                autoComplete="new-password"
                onChange={handleNewPasswordChange}
                aria-invalid={newPasswordError.length > 0}
                aria-describedby={
                  newPasswordError.length > 0 ? "newPasswordError" : undefined
                }
              />
                <div id="newPasswordError" className={modalStyles.fieldError}>
                  {newPasswordError}
                </div>
            </div>

            <div className={modalStyles.formGroup}>
              <label htmlFor="confirmPassword">{t("accountPage.confirmNewPassword")}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                autoComplete="new-password"
              />
            </div>

            {passwordError && (
              <div className={modalStyles.errorMessage}>{passwordError}</div>
            )}
          </>
        )}
      </Modal>

      <div className={cardStyles.cardSection}>
        <h3>{t("accountPage.studyDetails")}</h3>
        <TextInput
          label={t("accountPage.section")}
          value={state.section}
          onChange={onChange}
          name="section"
          icon={<Section />}
          type="select"
          options={sections}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 200px",
            gap: "16px",
          }}
        >
          <TextInput
            label={t("accountPage.program")}
            value={
              programs_in_section.length === 0
                ? no_programs.value
                : state.program
            }
            onChange={onChange}
            name="program"
            icon={<StudentHat />}
            type="select"
            disabled={programs_in_section.length === 0}
            options={
              programs_in_section.length === 0
                ? [no_programs]
                : programs_in_section
            }
          />
          <TextInput
            required
            label={t("accountPage.registrationYear")}
            value={
              state.registration_year === undefined ||
              state.registration_year === 0
                ? ""
                : state.registration_year.toString()
            }
            onChange={onChange}
            name="registration_year"
            type="number"
            placeholder="1987"
            error={errors.registration_year}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        <div className={styles.saveGroup}>
          <button
            className={`button activeButton ${formHasErrors ? "disabled" : ""}`}
            onClick={submitForm}
            disabled={formHasErrors}
          >
            {t("common.save")}
          </button>

          <p
            className={`${styles.draftSavedMessage} ${showSaveMessage ? styles.draftSavedMessageVisible : ""}`}
            aria-live="polite"
          >
            <span
              className={styles.draftSavedIconWrap}
              aria-hidden={!showSaveMessage}
            >
              <Image
                src="/icons/check-blue.svg"
                alt=""
                width={16}
                height={16}
                className={styles.draftSavedIcon}
              />
            </span>
            <span>{t("accountPage.accountDetailsSaved")}</span>
          </p>
        </div>

        <button className={`button`} onClick={resetForm}>
          {t("accountPage.reset")}
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <button
          className={`button ${styles.deleteButton}`}
          onClick={() => {
            setDeleteError("");
            setIsDeleteModalOpen(true);
          }}
          disabled={deleteLoading}
        >
          {t("accountPage.deleteAccount")}
        </button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onSubmit={handleDeleteAccount}
        title={t("accountPage.deleteAccount")}
        primaryButtonDisabled={deleteLoading}
        primaryButtonText={deleteLoading ? t("accountPage.deleting") : t("common.delete")}
        secondaryButtonDisabled={deleteLoading}
      >
        <p>{t("accountPage.deleteAccountConfirmation")}</p>
        {deleteError && (
          <div className={modalStyles.errorMessage}>{deleteError}</div>
        )}
      </Modal>

      <br style={{ marginBottom: 72 }} />
    </div>
  );
}
