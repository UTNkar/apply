"use client";
import styles from "@/styles/navbar.module.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useIsLoggedIn } from "@/utils/auth";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { setLanguageCookie } from "@/utils/language";

const Navbar = () => {
  const { i18n, t } = useTranslation();

  const [lang, setLang] = useState(i18n.language);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const { isLoggedIn, loading } = useIsLoggedIn();

  useEffect(() => {
    setMounted(true);
    setLang(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuOpen]);

  // Generate navigation links based on auth state
  const navLinks = useMemo(() => {
    const links = [
      { href: "/", label: t("navbar.home") },
      { href: "/about", label: t("navbar.about") },
    ];

    if (!loading) {
      if (isLoggedIn) {
        links.push(
          { href: "/account", label: t("navbar.account") },
          { href: "/logout", label: t("navbar.logOut") }
        );
      } else {
        links.push({ href: "/login", label: t("navbar.login") });
      }
    }

    return links;
  }, [isLoggedIn, loading, t]);

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang);
    i18n.changeLanguage(newLang);
    setLanguageCookie(newLang);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Language buttons component to avoid duplication
  const LanguageButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? styles.mobileLangBtns : styles.langBtns}>
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
  );

  return (
    <>
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
            style={{ height: "auto" }}
          />
        </a>

        {mounted && (
          <>
            <button
              className={styles.hamburger}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <div
                className={`${styles.hamburgerIcon} ${
                  menuOpen ? styles.open : ""
                }`}
              >
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className={styles.hamburgerText}>
                {menuOpen ? t("navbar.close") : t("navbar.menu")}
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className={styles.navbarItems}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${
                    pathname === link.href ? styles.activeNavLink : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <LanguageButtons />
            </div>
          </>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {mounted && menuOpen && (
        <div className={styles.overlay} onClick={closeMenu}></div>
      )}

      {/* Mobile Menu Drawer */}
      {mounted && (
        <div
          className={`${styles.mobileMenu} ${
            menuOpen ? styles.mobileMenuOpen : ""
          }`}
        >
          <div className={styles.mobileMenuContent}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileNavLink} ${
                  pathname === link.href ? styles.activeMobileNavLink : ""
                }`}
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
            <LanguageButtons mobile />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;