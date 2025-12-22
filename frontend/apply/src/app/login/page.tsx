"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TextInput from "@/components/TextInput";
import styles from "./login.module.css";
import Mail from "@/icons/mail.jsx";
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
        const data = await response.json();
        // Store CSRF token if needed
        if (data.csrf_token) {
          localStorage.setItem("csrf_token", data.csrf_token);
        }
        // Redirect to account page on successful login
        router.push("/account");
      } else if (response.status === 401) {
        setError("Invalid email or password");
      } else if (response.status === 403) {
        const data = await response.json();
        setError(data.message || "Email not verified or account inactive");
      } else {
        setError("An error occurred during login");
      }
    } catch (err) {
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
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <TextInput
            label="Email"
            value={email}
            onChange={handleChange}
            name="email"
            type="email"
            icon={<Mail />}
            placeholder="your.email@example.com"
            error={error && email === "" ? "Email is required" : ""}
          />

          <TextInput
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
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.links}>
          <a href="/signup" className={styles.link}>
            Don't have an account? Sign up
          </a>
          <a href="/forgot-password" className={styles.link}>
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
