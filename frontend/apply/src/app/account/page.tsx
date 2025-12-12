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

interface FormState {
  email: string;
  name: string;
  ssn: string;
  phone_number: string;
  program: string;
  registration_year: number;
  section: string;
}

type Errors = {
  [key in keyof FormState]?: string;
};

const sections = [
  {
    value: "F",
    name: "FUTF - Föreningen Uppsala tekniska fysiker",
    programs: [
      "Master's Programme in Engineering Physics",
      "Master's Programme in Quantum Technology",
    ],
  },
  {
    value: "E",
    name: "USE - Uppsala Studentföreningen Elektroteknik",
    programs: [
      "Master's Programme in Electrical Engineering",
      "Master's Programme in Renewable Electricity Generation",
      "Master's Programme in Electric Propulsion Systems",
    ],
  },
  {
    value: "IT",
    name: "Föreningen IT-sektionen",
    programs: [
      "Master's Programme in Information Technology",
      "Master's Programme in Embedded Systems",
    ],
  },
];

export default function Account() {
  const [state, setState] = useState<FormState>({
    name: "Karl Bertil Jonsson",
    email: "karl@bertil.se",
    ssn: "",
    phone_number: "",
    registration_year: 0,
    section: "F",
    program: "Master's Programme in Engineering Physics",
  });

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    fetch("http://localhost:8000/api/account").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        console.log("Fetched account data:", data);
        setState((prevState) => ({
          ...prevState,
          ...data,
        }));
      } else {
        const err = await res.text();
        console.error("Failed to fetch account data");
        console.error(err);
      }
    });
  }, []);

  const onError = (name: keyof FormState, error: string) => {
    setErrors((prevErrors: Errors) => ({
      ...prevErrors,
      [name]: error,
    }));
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const name = event.target.name;
    setState((prevState: FormState) => ({
      ...prevState,
      [name]: value,
    }));
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
          onClick={() => alert("What am I to do?")}
        >
          Update information
        </button>

        <div className={styles.formRow}>
          <TextInput
            label="Phone number"
            value={state.phone_number}
            onChange={onChange}
            name="phone_number"
            icon={<Phone />}
            type="text"
            error={
              state.phone_number !== "" ? "Invalid phone number" : undefined
            }
          />
          <TextInput
            label="Email"
            value={state.email}
            onChange={onChange}
            name="email"
            icon={<Mail />}
            error="Invalid email"
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
            value={state.program}
            onChange={onChange}
            name="program"
            icon={<StudentHat />}
            type="select"
            options={
              sections
                .find((s) => s.value === state.section)
                ?.programs.map((p) => ({ value: p, name: p })) || []
            }
          />
          <TextInput
            label="Registration year"
            value={
              state.registration_year === 0
                ? ""
                : state.registration_year.toString()
            }
            onChange={onChange}
            name="registration_year"
            type="number"
            placeholder="1987"
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          className={`button activeButton`}
          onClick={() => alert("Saving")}
          style={{ marginRight: 16 }}
        >
          Save
        </button>
        <button className={`button`} onClick={() => alert("Resetting")}>
          Reset
        </button>
      </div>

      <br style={{ marginBottom: 72 }} />
    </div>
  );
}
