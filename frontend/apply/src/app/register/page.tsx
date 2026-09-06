"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import TextInput from "@/components/TextInput";
import styles from "../register/register.module.css";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import Button from "@/components/Button";
import { signUp } from "@/utils/auth";
import { request, Method } from "@/utils/request";

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

export default function Signup() {
  const { t, i18n } = useTranslation();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [personalIdentityNumber, setPersonalIdentityNumber] = useState("");
  const [sectionValue, setSectionValue] = useState("");
  const [programValue, setProgramValue] = useState("");
  const [sections, setSections] = useState<Array<Section>>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registerError, setRegisterError] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "password") setPassword(value);
    if (name === "passwordConfirmation") setPasswordConfirmation(value);
    if (name === "personalIdentityNumber") setPersonalIdentityNumber(value);
    if (name === "section") {
      setSectionValue(value);
      const section = sections.find((section) => section.id === value);
      const firstProgram = section?.programs?.[0]?.id || "";
      setProgramValue(firstProgram);
    }
    if (name === "program") setProgramValue(value);

    // Clear field error on change
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = t("registerPage.passwordRequired");
    } else if (password.length < 10) {
      newErrors.password = t("registerPage.passwordTooShort");
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t("registerPage.passwordNeedsUppercase");
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t("registerPage.passwordNeedsNumber");
    }

    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = t(
        "registerPage.passwordConfirmationRequired",
      );
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = t("registerPage.passwordsDoNotMatch");
    }

    // Swedish personal identity number or T-number: YYMMDD/ YYYYMMDD with optional - or +
    const pinRegex = /^(?:\d{2})?\d{6}[-+]?[Tt\d]\d{3}$/;
    if (!personalIdentityNumber.trim()) {
      newErrors.personalIdentityNumber = t("registerPage.PersonNumberRequired");
    } else if (!pinRegex.test(personalIdentityNumber.trim())) {
      newErrors.personalIdentityNumber = t("registerPage.PersonNumberInvalid");
    }

    // Section
    if (!sectionValue.trim()) {
      newErrors.section = t("registerPage.sectionRequired");
    }

    // Program
    if (!programValue.trim()) {
      newErrors.program = t("registerPage.programRequired");
    }

    return newErrors;
  };

  const mapServerErrors = (data: unknown) => {
    const fieldErrors: Record<string, string> = {};
    let globalError = "";

    const fieldMap: Record<string, string> = {
      password: "password",
      ssn: "personalIdentityNumber",
      section_id: "section",
      study_program_id: "program",
      section: "section",
      program: "program",
    };

    if (typeof data === "string") {
      globalError = data;
      return { fieldErrors, globalError };
    }

    if (typeof data === "object" && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const text = Array.isArray(value) ? value.join(" ") : String(value);
        const fieldName = fieldMap[key];

        if (fieldName) {
          fieldErrors[fieldName] = text;
        } else if (key === "message" || key === "detail") {
          globalError = text;
        } else if (key === "non_field_errors") {
          globalError = text;
        } else if (text) {
          globalError = globalError ? `${globalError} ${text}`.trim() : text;
        }
      }
    }

    return { fieldErrors, globalError };
  };

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setRegisterError("");
    setLoading(true);

    try {
      const response = await signUp({
        ssn: personalIdentityNumber,
        password,
        study_program_id: programValue,
        section_id: sectionValue,
      });

      if (response.status === 201) {
        // Email is sourced from Unicore.
        // Display it so the user knows what to log in with.
        const data = await response.json();
        setSignupEmail((data as { email?: string })?.email || "");
        return;
      }

      const data = await response.json();
      const { fieldErrors, globalError } = mapServerErrors(data);
      setErrors((prev) => ({ ...prev, ...fieldErrors }));
      setRegisterError(globalError || t("registerPage.registerError"));
    } catch {
      setRegisterError(t("registerPage.networkError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const normalizeSections = (data: Section[]): Section[] => {
      const isSwedish = i18n.language === "sv";
      return data.map((section) => ({
        ...section,
        value: section.id,
        name: isSwedish ? section.section_sv : section.section_en,
        programs: section.programs.map((program) => ({
          ...program,
          value: program.id,
          name: isSwedish ? program.name_sv : program.name_en,
        })),
      }));
    };

    request(Method.GET, "/sections/").then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as Section[];
        setSections(normalizeSections(data));
      } else {
        const err = await res.text();
        console.error("Failed to fetch sections", err);
      }
    });
  }, [i18n.language]);

  const programs_in_section =
    sections.find((section) => section.id == sectionValue)?.programs || [];

  if (signupEmail) {
    // Show success message after successful registration
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginCard} style={{ maxWidth: "500px" }}>
          <h1 className={styles.title}>
            {t("registerPage.registerSuccessTitle")}
          </h1>
          <p>{t("registerPage.registerSuccessMessage", { email: signupEmail })}</p>
          <div className={styles.links}>
            <a href="/login" className={styles.link} style={{ padding: 0 }}>
              {t("navbar.login")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>{t("registerPage.registerTitle")}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label={t("registerPage.personalIdentityNumber")}
            value={personalIdentityNumber}
            onChange={handleChange}
            name="personalIdentityNumber"
            type="text"
            placeholder={t("registerPage.PersonNumberPlaceholder")}
            error={errors.personalIdentityNumber}
          />
          <br/>

          <TextInput
            required
            label={t("registerPage.password")}
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder={t("registerPage.passwordPlaceholder")}
            error={errors.password}
          />

          <TextInput
            required
            label={t("registerPage.passwordConfirmation")}
            value={passwordConfirmation}
            onChange={handleChange}
            name="passwordConfirmation"
            type="password"
            placeholder={t("registerPage.passwordConfirmationPlaceholder")}
            error={errors.passwordConfirmation}
          />

          <TextInput
            required
            label={t("registerPage.section")}
            value={sectionValue}
            onChange={handleChange}
            name="section"
            type="select"
            options={[
              { value: "", name: t("registerPage.selectSection") },
              ...sections,
            ]}
            error={errors.section}
          />

          <TextInput
            required
            label={t("registerPage.program")}
            value={programValue}
            onChange={handleChange}
            name="program"
            type="select"
            options={
              programs_in_section.length === 0
                ? [{ value: "", name: t("registerPage.selectSectionFirst") }]
                : [
                    { value: "", name: t("registerPage.selectProgram") },
                    ...programs_in_section.map((program) => ({
                      value: program.id,
                      name: program.name,
                    })),
                  ]
            }
            error={errors.program}
          />
        </form>

        {registerError && (
          <div className={styles.errorMessage}>{registerError}</div>
        )}

        <div className={styles.links}>
          <Button
            className="button activeButton"
            onClick={handleSubmit}
            disabled={loading}
            loading={loading}
          >
            {t("registerPage.registerAccount")}
          </Button>
          <a href="/login" className={styles.link}>
            {t("navbar.login")}
          </a>
        </div>
      </div>
    </div>
  );
}
