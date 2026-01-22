"use client";

import { useEffect, useState } from "react";
import TextInput from "../components/TextInput";
import styles from "@/account/account.module.css";
import Person from "@/icons/person.jsx";
import Number from "@/icons/number.jsx";
import Mail from "@/icons/mail.jsx";
import Phone from "@/icons/phone.jsx";
import Section from "@/icons/section.jsx";
import StudentHat from "@/icons/student-hat.jsx";
import { request, Method } from "@/utils/request";

interface Section {
  id: string;
  section_en: string;
  name: string;
  value: string;
  programs: Array<{
    id: string;
    name_en: string;
    name: string;
  }>;
}

interface FormState {
  email: string;
  name: string;
  ssn: string;
  phone_number: string;
  program: string;
  registration_year: number;
  section: string;
  study_program: { id: string; section: string } | null;
}

type Errors = {
  [key in keyof FormState]?: string;
};

export default function Account() {
  const default_state = {
    name: "",
    email: "",
    ssn: "",
    phone_number: "",
    registration_year: 0,
    section: "",
    program: "",
  };
  const [state, setState] = useState<FormState>(default_state);
  const [originalState, setOriginalState] = useState<FormState>(default_state);
  const [errors, setErrors] = useState<Errors>({});
  const [intermediateErrors, setIntermediateErrors] = useState<Errors>({});
  const [sections, setSections] = useState<Array<Section>>([]);

  // TODO call this every time the language changes
  const setProgramNames = () => {
    setSections((prev: Array<Section>) =>
      prev.map((section: Section) => {
        return {
          ...section,
          name: section.section_en,
          programs: section.programs.map((program) => ({
            ...program,
            name: program.name_en,
          })),
        };
      })
    );
  };

  const handleNewUserData = (data: FormState) => {
      data.program = data.study_program?.id || "";
      data.section = data.study_program?.section || "";
      setState((prevState: FormState) => ({
        ...prevState,
        ...data,
      }));
      setOriginalState((prevState: FormState) => ({
        ...prevState,
        ...data,
      }));
  };

  useEffect(() => {
    request(Method.GET, "/sections/").then(async (res) => {
      if (res.ok) {
        let data = await res.json();
        data = data.map((program) => ({ ...program, value: program.id }));
        setSections(data);
        setProgramNames();
      } else {
        const err = await res.text();
        console.error("Failed to fetch sections");
        console.error(err);
      }
    });
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
  }, []);

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

  const validateInput = (name: keyof FormState, value: string, target) => {
    // Validate required fields
    const required = target.required;
    if (required && value.length === 0) {
      // Get field label, e.g. "Email"
      const label =
        target.parentNode.querySelector(".label")?.innerText ?? "This field";
      onError(name, label + " is required");
      return;
    }

    // Validate formats
    switch (name) {
      case "email":
        // Validate email format (very permissive)
        const email_re = /^.*@.*$/;
        if (value.match(email_re) === null) {
          onError("email", "Invalid email format");
        }
        break;
      case "phone_number":
        // https://stackoverflow.com/questions/16699007/regular-expression-to-match-standard-10-digit-phone-number
        const phone_re =
          /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/;
        if (value.match(phone_re) === null) {
          onError("phone_number", "Invalid phone number format");
        }
        break;
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const name = event.target.name;
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
    (error) => error !== ""
  );

  const submitForm = () => {
    if (formHasErrors) {
      alert("There are errors in the form. Please adjust your inputs.");
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

  const programs_in_section =
    sections
      .find((s) => s.id == state.section)
      ?.programs.map((p) => ({ value: p.id, name: p.name })) || [];

  const no_programs = {
    value: "N/A",
    name: "Select a section to see its programs",
  };

  return (
    <div className="pageContainer">
      <h2>Account</h2>

      <div className={styles.card}>
        <h3>Contact information</h3>

        <div className={styles.formRow}>
          <TextInput
            label="Name"
            value={state.name}
            onChange={onChange}
            name="name"
            icon={<Person />}
            disabled
          />
          <TextInput
            label="Personal identity number"
            value={state.ssn}
            onChange={onChange}
            name="ssn"
            placeholder="yyyymmdd-xxxx"
            icon={<Number />}
            disabled
          />
        </div>
        <p>
          The information above is collected from our member registry. If the
          information has changed, but is not updated here, you can update it by
          pressing the button below.
        </p>

        <button
          className={`button activeButton`}
          onClick={() => alert("#TODO Not implemented!!!!!!!!!")}
          style={{ marginBottom: 24 }}
        >
          Update information
        </button>

        <div className={styles.formRow}>
          <TextInput
            required
            label="Phone number"
            value={state.phone_number}
            onChange={onChange}
            name="phone_number"
            icon={<Phone />}
            type="text"
            error={errors.phone_number}
          />
          <TextInput
            required
            label="Email"
            value={state.email}
            onChange={onChange}
            name="email"
            icon={<Mail />}
            error={errors.email}
          />
        </div>
      </div>

      <div className={styles.card}>
        <h3>Membership status</h3>
        You are a member since 2022.
      </div>

      <div className={styles.card}>
        <h3>Study details</h3>
        <TextInput
          label="Section"
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
            label="Program"
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
            label="Registration year"
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
          Save
        </button>
        <button className={`button`} onClick={resetForm}>
          Reset
        </button>
      </div>

      <br style={{ marginBottom: 72 }} />
    </div>
  );
}
