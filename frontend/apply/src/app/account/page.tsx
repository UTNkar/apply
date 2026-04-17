"use client";

import { useEffect, useState, useCallback } from "react";
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
  section_en: string;
  section_sv: string;
  name: string;
  value: string;
  programs: Array<Program>;
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

type AccountResponseData = Partial<FormState> & {
  study_program?: { id: string; section: string } | null;
};

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
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handlePasswordModalClose = () => {
    setPasswordError("");
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

    const formData = new FormData(e.currentTarget);
    const password = (formData.get("deletePassword") as string) || "";

    if (!password) {
      setDeleteError(t("passwordRequired"));
      setDeleteLoading(false);
      return;
    }

    try {
      const response = await request(Method.DELETE, "/account/", {
        password,
      });
      if (response.ok) {
        // Force window reload (instead of using router)
        window.location.href = "/login";
        return;
      }

      if (response.status === 400) {
        setDeleteError(t("accountDeletePasswordError"));
      } else {
        setDeleteError(t("accountDeleteError"));
      }
    } catch {
      setDeleteError(t("accountDeleteError"));
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
      setPasswordError(t("passwordsDoNotMatch"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("passwordTooShort"));
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await request(Method.POST, "/auth/change-password", {
        old_password: currentPassword,
        new_password: newPassword,
      });

      if (response.ok) {
        setPasswordSuccess(true);
        setTimeout(() => {
          // Force window reload (instead of using router)
          window.location.href = "/login";
        }, 1500);
      } else {
        setPasswordError(t("passwordChangeError"));
      }
    } catch {
      setPasswordError(t("passwordChangeError"));
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

  const handleNewUserData = (data: AccountResponseData) => {
    const normalizedData = {
      ...data,
      program: data.study_program?.id || "",
      section: data.study_program?.section || "",
    };
    setState((prevState: FormState) => ({
      ...prevState,
      ...normalizedData,
    }));
    setOriginalState((prevState: FormState) => ({
      ...prevState,
      ...normalizedData,
    }));
  };

  useEffect(() => {
    // Fetch sections and programs
    request(Method.GET, "/sections/").then(async (res) => {
      if (res.ok) {
        let data = await res.json();
        data = data.map((program: Program) => ({
          ...program,
          value: program.id,
        }));
        setSections(data);
        setProgramNames();
      } else {
        const err = await res.text();
        console.error("Failed to fetch sections");
        console.error(err);
      }
    });
    // Fetch user account data
    request(Method.GET, "/account/").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
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
  }, [setProgramNames]);

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
    target: HTMLInputElement,
  ) => {
    // Validate required fields
    const required = target.required;
    if (required && value.length === 0) {
      // Get field label, e.g. "Email"
      const labelElement = target.parentElement?.querySelector(".label");
      const label =
        labelElement instanceof HTMLElement
          ? labelElement.innerText
          : t("thisField");
      onError(name, label + " " + t("isRequired"));
      return;
    }

    // Validate formats
    switch (name) {
      case "email":
        // Validate email format (very permissive)
        const email_re = /^.*@.*$/;
        if (value.match(email_re) === null) {
          onError("email", t("invalidEmailFormat"));
        }
        break;
      case "phone_number":
        // https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
        const phone_re =
          /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
        if (value.match(phone_re) === null) {
          onError("phone_number", t("invalidPhoneFormat"));
        }
        break;
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      alert(t("formHasErrors"));
      return;
    }
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
    name: t("selectSectionFirst"),
  };

  const membershipText = (memberSince: string) => {
    if (memberSince === "Not a member") {
      return t("notMemberInfo");
    }
    if (memberSince === "Member") {
      return t("isMemberInfo");
    }
    if (memberSince.length === 0) {
      return t("loadingMembershipInfo");
    }
    return `${t("memberSince")} ${formatDate(memberSince)}.`;
  };

  return (
    <div className="pageContainer">
      <h2>{t("accountTitle")}</h2>

      <div className={cardStyles.cardSection}>
        <h3>{t("contactInformation")}</h3>

        <div className={styles.formRow}>
          <TextInput
            label={t("name")}
            value={state.name}
            onChange={onChange}
            name="name"
            icon={<Person />}
            disabled
          />
          <TextInput
            label={t("personalIdentityNumber")}
            value={state.ssn}
            onChange={onChange}
            name="ssn"
            placeholder="yyyymmdd-xxxx"
            icon={<Number />}
            disabled
          />
        </div>
        <p>{t("memberRegistryInfo")}</p>

        <Button
          onClick={update_info_from_unicore}
          style={{ marginBottom: 24 }}
          disabled={unicoreLoading}
          loading={unicoreLoading}
        >
          {t("updateInformation")}
        </Button>

        <div className={styles.formRow}>
          <TextInput
            required
            label={t("phoneNumber")}
            value={state.phone_number}
            onChange={onChange}
            name="phone_number"
            icon={<Phone />}
            type="text"
            error={errors.phone_number}
          />
          <TextInput
            required
            label={t("email")}
            value={state.email}
            onChange={onChange}
            name="email"
            icon={<Mail />}
            error={errors.email}
          />
        </div>
      </div>

      <div className={cardStyles.cardSection}>
        <h3>{t("membershipStatus")}</h3>
        <p>{membershipText(memberSince)}</p>
      </div>

      <div className={cardStyles.cardSection}>
        <h3>{t("accountSecurity")}</h3>
        <p>{t("changePasswordDescription")}</p>
        <Button
          onClick={() => setIsPasswordModalOpen(true)}
          style={{ margin: "12px 0px" }}
        >
          {t("changePassword")}
        </Button>
      </div>

      <Modal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordModalClose}
        onSubmit={handlePasswordSubmit}
        title={t("changePassword")}
        primaryButtonDisabled={passwordLoading}
        primaryButtonText={passwordLoading ? t("saving") : t("changePassword")}
        secondaryButtonDisabled={passwordLoading}
      >
        {passwordSuccess ? (
          <div className={modalStyles.successMessage}>
            {t("passwordChanged")}
          </div>
        ) : (
          <>
            <div className={modalStyles.formGroup}>
              <label htmlFor="currentPassword">{t("currentPassword")}</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                required
                autoComplete="current-password"
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label htmlFor="newPassword">{t("newPassword")}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                required
                autoComplete="new-password"
              />
            </div>

            <div className={modalStyles.formGroup}>
              <label htmlFor="confirmPassword">{t("confirmNewPassword")}</label>
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
        <h3>{t("studyDetails")}</h3>
        <TextInput
          label={t("section")}
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
            label={t("program")}
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
            label={t("registrationYear")}
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

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          className={`button activeButton ${formHasErrors ? "disabled" : ""}`}
          onClick={submitForm}
          style={{ marginRight: 16 }}
          disabled={formHasErrors}
        >
          {t("save")}
        </button>
        <button className={`button`} onClick={resetForm}>
          {t("reset")}
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
          {t("deleteAccount")}
        </button>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onSubmit={handleDeleteAccount}
        title={t("deleteAccount")}
        primaryButtonDisabled={deleteLoading}
        primaryButtonText={deleteLoading ? t("deleting") : t("deleteAccount")}
        secondaryButtonDisabled={deleteLoading}
      >
        <p>{t("deleteAccountConfirmation")}</p>
        <div className={modalStyles.formGroup}>
          <label htmlFor="deletePassword">{t("currentPassword")}</label>
          <input
            type="password"
            id="deletePassword"
            name="deletePassword"
            required
            autoComplete="current-password"
          />
        </div>
        {deleteError && (
          <div className={modalStyles.errorMessage}>{deleteError}</div>
        )}
      </Modal>

      <br style={{ marginBottom: 72 }} />
    </div>
  );
}
