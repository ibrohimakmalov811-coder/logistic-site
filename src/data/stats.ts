/**
 * MARKET STATISTICS DATA FILE
 * 
 * STRICT CONTENT INTEGRITY RULES:
 * 1. Use ONLY the three verified-source market statistics specified below.
 * 2. Do NOT invent or add any other statistics or claims.
 * 3. Keep visible source links and exact references.
 * 
 * VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH
 */

export interface MarketStatItem {
  id: string;
  numericValue?: number;
  displayValue: string;
  unit?: string;
  exactWording: {
    uz: string;
    ru: string;
    en: string;
  };
  contextNote?: {
    uz: string;
    ru: string;
    en: string;
  };
  sourceName: string;
  sourceUrl: string;
  verificationStatus: "VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH";
}

export const marketStats: MarketStatItem[] = [
  {
    id: "gps-and-feedback-adoption",
    numericValue: 27,
    displayValue: "27%",
    unit: "%",
    exactWording: {
      uz: "Kompaniyalarning atigi 27% qismi GPS monitoringidan foydalanadi va 23% qismi yetkazib berishdan so'ng mijoz fikrini yig'adi.",
      ru: "Лишь 27% компаний используют GPS-мониторинг и только 23% собирают обратную связь после доставки.",
      en: "Only 27% of companies use GPS monitoring and only 23% collect feedback after delivery.",
    },
    contextNote: {
      uz: "O'zbekistondagi B2B FMCG yetkazib berish bozori holati",
      ru: "Исследование B2B FMCG рынка доставки в Узбекистане",
      en: "Study on Uzbekistan's B2B FMCG delivery market",
    },
    sourceName: "Relog tadqiqoti / UzDaily",
    sourceUrl: "https://www.uzdaily.ru/en/why-in-city-delivery-costs-are-rising-and-what-the-fmcg-market-can-do/",
    verificationStatus: "VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH",
  },
  {
    id: "online-retailers-last-mile",
    numericValue: 67,
    displayValue: "67%",
    unit: "% gacha",
    exactWording: {
      uz: "Onlayn-riteylerlarning 67% gachasi oxirgi milya (oxirgi manzilga yetkazish) bosqichidagi muammolarga duch kelgan.",
      ru: "До 67% онлайн-ритейлеров сталкивались с проблемами последней мили при доставке.",
      en: "Up to 67% of online retailers have experienced last-mile delivery problems.",
    },
    contextNote: {
      uz: "Eslatma: bu ko'rsatkich aynan onlayn-riteylerlarga tegishli, yuk tashuvchilarga umumlashtirilmagan.",
      ru: "Важно: статистика относится именно к онлайн-ритейлерам, а не ко всем грузоперевозчикам.",
      en: "Important: this figure applies specifically to online retailers, not logistics carriers in general.",
    },
    sourceName: "Relog tadqiqoti / UzDaily",
    sourceUrl: "https://www.uzdaily.ru/en/why-in-city-delivery-costs-are-rising-and-what-the-fmcg-market-can-do/",
    verificationStatus: "VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH",
  },
  {
    id: "scattered-operations-reality",
    displayValue: "Ko'pchilik",
    exactWording: {
      uz: "Ko'plab logistika kompaniyalari haligacha yagona tizimsiz ishlaydi: buyurtmalar qo'ng'iroqlar va messenjerlar orqali qabul qilinadi, ma'lumotlar tarqoq, yuk nazorati esa qo'lda amalga oshiriladi.",
      ru: "Многие логистические компании по-прежнему работают без единой системы: заявки принимаются по звонкам и мессенджерам, данные разрознены, а контроль груза ведется вручную.",
      en: "Many logistics companies still operate without a unified system: orders arrive via calls and messengers, data is scattered, and cargo tracking is handled manually.",
    },
    contextNote: {
      uz: "Sifat tahlili (foizsiz baholash)",
      ru: "Качественная оценка рынка (без процентной привязки)",
      en: "Qualitative market assessment (no percentage assigned)",
    },
    sourceName: "LogiTrends Uzbekistan 2026 / Spot.uz",
    sourceUrl: "https://www.spot.uz/ru/2026/06/12/logistics/",
    verificationStatus: "VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH",
  },
];

export const macroTradeContext = {
  valueText: "$50B → $81.2B",
  exactWording: {
    uz: "O'zbekistonning tashqi savdo aylanmasi 2022-yildagi $50 mlrd dan 2025-yilda $81.2 mlrd ga yetdi, bu esa ishonchli logistika boshqaruviga bo'lgan talabni keskin oshirmoqda.",
    ru: "Внешнеторговый оборот Узбекистана вырос с $50 млрд (2022) до $81,2 млрд (2025), увеличивая потребность в прозрачном управлении перевозками.",
    en: "Uzbekistan's foreign trade turnover grew from $50B (2022) to $81.2B (2025), driving surging demand for reliable logistics coordination.",
  },
  sourceName: "Spot.uz / LogiTrends 2026",
  sourceUrl: "https://www.spot.uz/ru/2026/06/12/logistics/",
  verificationStatus: "VERIFY AGAINST THE ORIGINAL SOURCE BEFORE LAUNCH" as const,
};
