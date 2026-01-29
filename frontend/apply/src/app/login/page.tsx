"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import styles from "./login.module.css";
import { logIn } from "@/utils/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await logIn(email, password);

      if (response.status === 200) {
        window.dispatchEvent(new CustomEvent('logged-in'));
        router.push("/account");
      } else if (response.status === 401) {
        setError("Incorrect email or password");
      } else if (response.status === 403) {
        const data = await response.json();
        setError(data.message || "Email not verified or account inactive");
      } else {
        setError("An error occurred during login");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") setEmail(value);
    if (name === "password") setPassword(value);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <h1 className={styles.title}>Login</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            required
            label="Email"
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            placeholder="your.email@example.com"
            error={error && email === "" ? "Email is required" : ""}
          />

          <TextInput
            required
            label="Password"
            value={password}
            onChange={handleChange}
            name="password"
            type="password"
            placeholder="Enter your password"
            error={error && password === "" ? "Password is required" : ""}
          />

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            className="button activeButton"
            style={{ margin: "12px auto 0" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.links}>
          <a href="/signup" className={styles.link}>
            Don&apos;t have an account? Register here
          </a>
          <a href="/forgot-password" className={styles.link}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
