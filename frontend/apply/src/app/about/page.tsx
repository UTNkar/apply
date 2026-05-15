"use client";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import { getImageUrl } from "@/utils/imageUrl";

export default function About() {
  const { t } = useTranslation();
  return (
    <div className="pageContainer">
      <h1 style={{ marginTop: 48 }}>{t("aboutPage.title")}</h1>
      <p>{t("aboutPage.introText")}</p>
      <Image
        src={getImageUrl("/städfestival-ht24.jpg")}
        style={{ margin: "12px 0" }}
        alt="UTN members in front of our union house in winter"
      ></Image>

      <p>{t("aboutPage.timeRequiredText")}</p>

      <p>{t("aboutPage.purposeText")}</p>

      <p>{t("aboutPage.benefitsText")}</p>

      <h2>{t("aboutPage.howToApplyTitle")}</h2>
      <p>
        {t("aboutPage.applyHereText")}{" "}
        <a href="https://apply.utn.se">apply.utn.se</a>!
      </p>

      <p>{t("aboutPage.applyProcessText")}</p>

      <h2>{t("aboutPage.processingTitle")}</h2>
      <p>{t("aboutPage.processingText")}</p>

      <h2>{t("aboutPage.questionsTitle")}</h2>
      <p>
        {t("aboutPage.moreInfoText")}{" "}
        <a href={t("aboutPage.moreInfoUrl")}>
          {t("aboutPage.moreInfoWebsite")}
        </a>
        {t("aboutPage.moreInfoContinuationText")}
      </p>

      <p>
        {t("aboutPage.contactText")}{" "}
        <a href="mailto:jagvillengageramig@utn.se">jagvillengageramig@utn.se</a>
      </p>
    </div>
  );
}
