"use client";
import styles from "@/styles/navbar.module.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useIsLoggedIn } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { setLanguageCookie } from "@/utils/language";

const Navbar = () => {
  const { i18n, t } = useTranslation();
  const [lang, setLang] = useState("sv");
  const pathname = usePathname();
  const { isLoggedIn, loading } = useIsLoggedIn();

  useEffect(() => {
    setLang(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
    setLanguageCookie(newLang);
  };

  return (
    <div className={styles.navbar}>
      <a
        className={styles.logo}
        href="https://www.utn.se"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/utn_standard_bla.png"
          alt="Logo"
          width={200}
          height={51.25}
        />
      </a>
      <div className={styles.navbarItems}>
        <Link
          href="/"
          className={`${styles.navLink} ${
            pathname === "/" ? styles.activeNavLink : ""
          }`}
        >
          {t("home")}
        </Link>
        <Link
          href="/about"
          className={`${styles.navLink} ${
            pathname === "/about" ? styles.activeNavLink : ""
          }`}
        >
          {t("about")}
        </Link>
        {!loading &&
          (isLoggedIn ? (
            <>
              <Link
                href="/account"
                className={`${styles.navLink} ${
                  pathname === "/account" ? styles.activeNavLink : ""
                }`}
              >
                {t("account")}
              </Link>
              <Link
                href="/logout"
                className={`${styles.navLink} ${
                  pathname === "/logout" ? styles.activeNavLink : ""
                }`}
              >
                {t("logOut")}
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className={`${styles.navLink} ${
                pathname === "/login" ? styles.activeNavLink : ""
              }`}
            >
              {t("login")}
            </Link>
          ))}

        <div className={styles.langBtns}>
          <button
            onClick={() => handleLanguageChange("sv")}
            className={`${styles.svLang} smallButton ${
              lang === "sv" ? styles.activeBtn : ""
            }`}
          >
            Svenska
          </button>
          <button
            onClick={() => handleLanguageChange("en")}
            className={`${styles.engLang} smallButton ${
              lang === "en" ? styles.activeBtn : ""
            }`}
          >
            English
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
