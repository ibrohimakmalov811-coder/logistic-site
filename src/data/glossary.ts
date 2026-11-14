export interface GlossaryTerm {
  key: string;
  uz: string;
  ru: string;
  en: string;
  definitionUz: string;
  definitionRu: string;
  definitionEn: string;
}

export const LOGISTICS_GLOSSARY: GlossaryTerm[] = [
  {
    key: "carrier",
    uz: "Tashuvchi / Avtopark",
    ru: "Перевозчик / Автопарк",
    en: "Carrier / Fleet Owner",
    definitionUz: "O'z yuk transport vositalariga ega bo'lgan va yuk tashish xizmatini ko'rsatuvchi tashkilot.",
    definitionRu: "Организация, владеющая грузовым транспортом и оказывающая транспортные услуги.",
    definitionEn: "Entity that owns freight transport vehicles and executes cargo delivery services.",
  },
  {
    key: "dispatcher",
    uz: "Dispetcher",
    ru: "Диспетчер",
    en: "Dispatcher",
    definitionUz: "Yuk buyurtmalarini qabul qiluvchi, haydovchilarga reyslarni biriktiruvchi va yetkazib berishni monitoring qiluvchi mutaxassis.",
    definitionRu: "Специалист, распределяющий заказы водителям и контролирующий процесс перевозки.",
    definitionEn: "Logistics specialist managing order assignment, driver schedules, and transit monitoring.",
  },
  {
    key: "driver",
    uz: "Haydovchi",
    ru: "Водитель",
    en: "Driver",
    definitionUz: "Yuk mashinasini boshqaruvchi va yukni manzilga yetkazib topshiruvchi mas'ul xodim.",
    definitionRu: "Лицо, управляющее грузовым автомобилем и сдающее груз грузополучателю.",
    definitionEn: "Person operating the commercial truck and delivering the freight to the recipient.",
  },
  {
    key: "order",
    uz: "Reys / Buyurtma",
    ru: "Рейс / Заказ",
    en: "Order / Shipment",
    definitionUz: "Yuklash joyidan tushirish manziliga qadar bitta transport vositasida amalga oshiriladigan logistika topshirig'i.",
    definitionRu: "Логистическое задание по доставке партии груза от точки погрузки до точки выгрузки.",
    definitionEn: "A freight transportation job from pickup location to delivery address.",
  },
  {
    key: "pod",
    uz: "Topshirish dalili (POD)",
    ru: "Подтверждение доставки (POD)",
    en: "Proof of Delivery (POD)",
    definitionUz: "Yuk mijozga topshirilganini tasdiqlovchi imzo, muhr yoki yuk xati fotosurati.",
    definitionRu: "Фотография товарно-транспортной накладной с подписью и печатью получателя.",
    definitionEn: "A signed document or photo proving that the shipment has been received by the consignee.",
  },
  {
    key: "backhaul",
    uz: "Qaytish yo'nalishi (Bo'sh qatnov)",
    ru: "Обратный рейс (Холостой пробег)",
    en: "Backhaul",
    definitionUz: "Yuk topshirilgach, avtomobilning o'z bazasiga yoki keyingi yuklash nuqtasiga bo'sh holda qaytishi.",
    definitionRu: "Возвращение порожнего грузовика после выгрузки на исходную базу.",
    definitionEn: "The return trip of a commercial truck that can be monetized to eliminate empty miles.",
  },
  {
    key: "invite_code",
    uz: "Bir martalik taklif kodi",
    ru: "Одноразовый инвайт-код",
    en: "Single-Use Invite Code",
    definitionUz: "Kompaniya tomonidan yangi haydovchi yoki dispetcherni o'z tizimiga xavfsiz ulash uchun yaratiladigan maxsus kod.",
    definitionRu: "Одноразовый уникальный код для защищенного подключения водителя к автопарку компании.",
    definitionEn: "A secure, one-time alphanumeric code allowing drivers to link with their company.",
  },
];
