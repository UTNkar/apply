"use client";

import { useState } from "react";
import TextInput from "../components/TextInput";
import styles from "./account.module.css";
import Person from "@/icons/person.jsx";
import Number from "@/icons/number.jsx";
import Mail from "@/icons/mail.jsx";
import Phone from "@/icons/phone.jsx";
import Section from "@/icons/section.jsx";
import StudentHat from "@/icons/student-hat.jsx";

interface FormState {
  email: string;
  name: string;
  pid: string;
  phone_number: string;
  program: string;
  registration_year: number;
  section: string;
}

export default function Account() {
  const [state, setState] = useState<FormState>({
    name: "Karl Bertil Jonsson",
    email: "karl@bertil.se",
    pid: "",
    phone_number: "",
    registration_year: 0,
    section: "FUTF - Föreningen Uppsala tekniska fysiker",
    program: "Master's Programme in Engineering Physics",
  });

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const name = event.target.name;
    console.log("onChange", name, value);
    setState((prevState) => ({
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
          />
          <TextInput
            label="Personal identity number"
            value={state.pid}
            onChange={onChange}
            name="pid"
            placeholder="yyyymmdd-xxxx"
            icon={<Number />}
          />
        </div>
        <div className={styles.formRow}>
          <TextInput
            label="Phone number"
            value={state.phone_number}
            onChange={onChange}
            name="phone_number"
            icon={<Phone />}
            type="number"
          />
          <TextInput
            label="Email"
            value={state.email}
            onChange={onChange}
            name="email"
            icon={<Mail />}
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
        />
        <TextInput
          label="Program"
          value={state.program}
          onChange={onChange}
          name="program"
          icon={<StudentHat />}
        />
      </div>
    </div>
  );
}
