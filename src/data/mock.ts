/**
 * SHARED MOCK DATA MODULE
 * Single source of truth for mockups (Hero, Product Preview, Backhaul diagram).
 * Provides consistent plates, drivers, models, routes, and locale-aware place names.
 */

export type MockLocale = "uz" | "ru" | "en";

export interface MockCity {
  id: "tashkent" | "samarkand" | "andijan" | "bukhara" | "qarshi";
  name: Record<MockLocale, string>;
}

export const MOCK_CITIES: Record<MockCity["id"], Record<MockLocale, string>> = {
  tashkent: {
    uz: "Toshkent",
    ru: "Ташкент",
    en: "Tashkent",
  },
  samarkand: {
    uz: "Samarqand",
    ru: "Самарканд",
    en: "Samarkand",
  },
  andijan: {
    uz: "Andijon",
    ru: "Андижан",
    en: "Andijan",
  },
  bukhara: {
    uz: "Buxoro",
    ru: "Бухара",
    en: "Bukhara",
  },
  qarshi: {
    uz: "Qarshi",
    ru: "Карши",
    en: "Qarshi",
  },
};

export const MOCK_CORRIDORS: Record<string, Record<MockLocale, string>> = {
  m39_jizzakh: {
    uz: "M39 trassasi (Jizzax hududi)",
    ru: "Трасса M39 (Джизак)",
    en: "M39 Highway (Jizzakh)",
  },
};

export interface MockVehicleTrip {
  id: string;
  plate: string;
  model: string;
  driverFullName: Record<MockLocale, string>;
  driverShortName: Record<MockLocale, string>;
  origin: keyof typeof MOCK_CITIES;
  destination: keyof typeof MOCK_CITIES;
  status: "moving" | "unloading" | "delivered";
  statusText: Record<MockLocale, string>;
  eta: Record<MockLocale, string>;
}

export const MOCK_VEHICLES: MockVehicleTrip[] = [
  {
    id: "TRK-01",
    plate: "01 789 AFA",
    model: "Isuzu 5t",
    driverFullName: {
      uz: "Alisher Qodirov",
      ru: "Алишер Кадыров",
      en: "Alisher Kadyrov",
    },
    driverShortName: {
      uz: "Alisher Q.",
      ru: "Алишер К.",
      en: "Alisher K.",
    },
    origin: "tashkent",
    destination: "samarkand",
    status: "moving",
    statusText: {
      uz: "Harakatda (72 km/soat)",
      ru: "В пути (72 км/ч)",
      en: "In transit (72 km/h)",
    },
    eta: {
      uz: "14:30",
      ru: "14:30",
      en: "14:30",
    },
  },
  {
    id: "TRK-02",
    plate: "10 342 BBA",
    model: "MAN 20t",
    driverFullName: {
      uz: "Jamshid Boboyev",
      ru: "Жамшид Бабаев",
      en: "Jamshid Babaev",
    },
    driverShortName: {
      uz: "Jamshid B.",
      ru: "Жамшид Б.",
      en: "Jamshid B.",
    },
    origin: "tashkent",
    destination: "andijan",
    status: "unloading",
    statusText: {
      uz: "Yuk tushirmoqda",
      ru: "Разгрузка",
      en: "Unloading",
    },
    eta: {
      uz: "Yetib bordi",
      ru: "Прибыл",
      en: "Arrived",
    },
  },
  {
    id: "TRK-03",
    plate: "80 112 CAA",
    model: "Isuzu 7t",
    driverFullName: {
      uz: "Farhod Mahmudov",
      ru: "Фарход Махмудов",
      en: "Farhod Makhmudov",
    },
    driverShortName: {
      uz: "Farhod M.",
      ru: "Фарход М.",
      en: "Farhod M.",
    },
    origin: "bukhara",
    destination: "qarshi",
    status: "delivered",
    statusText: {
      uz: "Topshirildi (PoD)",
      ru: "Сдано (PoD)",
      en: "Delivered (PoD)",
    },
    eta: {
      uz: "11:45",
      ru: "11:45",
      en: "11:45",
    },
  },
];

export function getMockRoute(
  trip: MockVehicleTrip,
  locale: MockLocale
): string {
  const originName = MOCK_CITIES[trip.origin][locale] || MOCK_CITIES[trip.origin].uz;
  const destName = MOCK_CITIES[trip.destination][locale] || MOCK_CITIES[trip.destination].uz;
  return `${originName} → ${destName}`;
}
