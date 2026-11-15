export * from "./types";
export * from "./schemas";
export * from "./crypto";
export * from "./storage-engine";
export * from "./sync-channel";
export * from "./idb";
export * from "./repositories/contracts";
export * from "./repositories/local-repository";

import {
  LocalCompanyRepository,
  LocalInviteRepository,
  LocalNotificationRepository,
  LocalOrderRepository,
  LocalUserRepository,
  LocalVehicleRepository,
} from "./repositories/local-repository";
import { hashPassword } from "./crypto";
import { loadSnapshot, resetSnapshot, saveSnapshot } from "./storage-engine";
import { clearAllBlobs } from "./idb";
import { OrderEntity, OrderStatus, VehicleType } from "./types";

export const userRepo = new LocalUserRepository();
export const companyRepo = new LocalCompanyRepository();
export const inviteRepo = new LocalInviteRepository();
export const vehicleRepo = new LocalVehicleRepository();
export const orderRepo = new LocalOrderRepository();
export const notificationRepo = new LocalNotificationRepository();

/**
 * Resets all demo data in localStorage and IndexedDB.
 */
export async function resetAllData(): Promise<void> {
  resetSnapshot();
  await clearAllBlobs();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("transflow_session_id");
    window.sessionStorage.clear();
    document.cookie = "tf_session=; path=/; max-age=0; SameSite=Lax";
  }
}

/**
 * Seeds realistic demo data for Plan A demonstration.
 * Creates:
 *  - 1 Company ("Silk Road Trans Logistics", Tashkent)
 *  - 1 Company Owner (Akmal Karimov, company@transflow.uz)
 *  - 1 Dispatcher (Dilshod Rahimov, dispatcher@transflow.uz)
 *  - 2 Drivers (Jamshid Aliyev: driver@transflow.uz, Sardor Toshmatov: driver2@transflow.uz)
 *  - 3 Vehicles (Tent, Isotherm, Refrigerator)
 *  - 2 Ready Invites (1 for driver, 1 for dispatcher)
 *  - 8 Sample Orders across all states
 */
export async function seedDemoData(): Promise<void> {
  await resetAllData();

  const defaultPassword = "password123";
  const { passwordHash, salt } = await hashPassword(defaultPassword);

  // 1. Create Users
  const owner = await userRepo.create(
    {
      role: "company_owner",
      fullName: "Akmal Karimov",
      phone: "+998901234567",
      email: "company@transflow.uz",
      language: "uz",
      avatar: null,
    },
    passwordHash,
    salt
  );
  await userRepo.update(owner.id, { onboardingCompleted: true });

  const dispatcher = await userRepo.create(
    {
      role: "dispatcher",
      fullName: "Dilshod Rahimov",
      phone: "+998901234568",
      email: "dispatcher@transflow.uz",
      language: "uz",
      avatar: null,
    },
    passwordHash,
    salt
  );
  await userRepo.update(dispatcher.id, { onboardingCompleted: true });

  const driver1 = await userRepo.create(
    {
      role: "driver",
      fullName: "Jamshid Aliyev",
      phone: "+998901234569",
      email: "driver@transflow.uz",
      language: "uz",
      avatar: null,
    },
    passwordHash,
    salt
  );
  await userRepo.update(driver1.id, { onboardingCompleted: true });

  const driver2 = await userRepo.create(
    {
      role: "driver",
      fullName: "Sardor Toshmatov",
      phone: "+998901234570",
      email: "driver2@transflow.uz",
      language: "uz",
      avatar: null,
    },
    passwordHash,
    salt
  );
  await userRepo.update(driver2.id, { onboardingCompleted: true });

  // 2. Create Company
  const company = await companyRepo.create(
    owner.id,
    "Silk Road Trans Logistics",
    "Toshkent",
    "10-25",
    ["Qurilish materiallari", "Oziq-ovqat mahsulotlari", "Sanoat uskunalari"]
  );

  // 3. Link Memberships
  await companyRepo.addMember(company.id, dispatcher.id, "dispatcher");
  await companyRepo.addMember(company.id, driver1.id, "driver");
  await companyRepo.addMember(company.id, driver2.id, "driver");

  // 4. Create Vehicles
  const v1 = await vehicleRepo.create({
    companyId: company.id,
    plateNumber: "01 A 777 AA",
    type: "tent",
    capacityKg: 22000,
    status: "active",
  });

  const v2 = await vehicleRepo.create({
    companyId: company.id,
    plateNumber: "01 B 888 BB",
    type: "refrigerator",
    capacityKg: 20000,
    status: "active",
  });

  const v3 = await vehicleRepo.create({
    companyId: company.id,
    plateNumber: "01 C 999 CC",
    type: "isotherm",
    capacityKg: 15000,
    status: "active",
  });

  // 5. Driver Profiles
  await companyRepo.saveDriverProfile({
    userId: driver1.id,
    companyId: company.id,
    licenseCategory: "CE",
    experienceYears: 6,
    vehicleId: v1.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await companyRepo.saveDriverProfile({
    userId: driver2.id,
    companyId: company.id,
    licenseCategory: "CE",
    experienceYears: 4,
    vehicleId: v2.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 6. Invites
  await inviteRepo.createInvite(company.id, owner.id, "driver", 14);
  await inviteRepo.createInvite(company.id, owner.id, "dispatcher", 14);

  // 7. Orders
  const ordersSeed = [
    {
      companyId: company.id,
      pickupAddress: "Toshkent, Sergeli sanoat zonasi, 4-bino",
      deliveryAddress: "Samarqand, Gagarin ko'chasi 12",
      cargoDescription: "Plastik quvurlar va fitinglar",
      weightKg: 18500,
      deadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      customerName: "Samarqand Qurilish MCHJ",
      customerPhone: "+998901112233",
      notes: "Ehtiyotkorlik bilan yuklansin, kran talab qilinadi",
      driverId: driver1.id,
      vehicleId: v1.id,
      status: "in_transit" as OrderStatus,
    },
    {
      companyId: company.id,
      pickupAddress: "Toshkent, Chilonzor omborxona #2",
      deliveryAddress: "Farg'ona, Markaziy bozor logistika markazi",
      cargoDescription: "Yengil sanoat to'qimachilik mahsulotlari",
      weightKg: 12000,
      deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      customerName: "Fergana Textile LLC",
      customerPhone: "+998933334455",
      notes: "Tentli fura bo'lishi shart, namlikdan saqlansin",
      driverId: driver2.id,
      vehicleId: v2.id,
      status: "assigned" as OrderStatus,
    },
    {
      companyId: company.id,
      pickupAddress: "Andijon, Asaka avto ehtiyot qismlari ombori",
      deliveryAddress: "Toshkent, Yangiyo'l logistika xabi",
      cargoDescription: "Avtomobil detallari va qutilar",
      weightKg: 21000,
      deadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      customerName: "UzAuto Komponent",
      customerPhone: "+998977778899",
      notes: "Hujjatlar to'liq topshirilishi kerak",
      driverId: null,
      vehicleId: null,
      status: "new" as OrderStatus,
    },
    {
      companyId: company.id,
      pickupAddress: "Buxoro, Neftgaz majmuasi hududi",
      deliveryAddress: "Navoiy, Erkin iqtisodiy zona",
      cargoDescription: "Metall konstruksiyalar",
      weightKg: 19500,
      deadline: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      customerName: "Navoiy Prom Montaj",
      customerPhone: "+998912223344",
      notes: "Muvaffaqiyatli yetkazildi",
      driverId: driver1.id,
      vehicleId: v1.id,
      status: "delivered" as OrderStatus,
    },
  ];

  for (const o of ordersSeed) {
    const created = await orderRepo.create({
      companyId: o.companyId,
      pickupAddress: o.pickupAddress,
      deliveryAddress: o.deliveryAddress,
      cargoDescription: o.cargoDescription,
      weightKg: o.weightKg,
      deadline: o.deadline,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      notes: o.notes,
      driverId: o.driverId,
      vehicleId: o.vehicleId,
    });
    if (o.status !== "new" && o.status !== "assigned") {
      await orderRepo.updateStatus(created.id, o.status, owner.id, "Boshlang'ich demo holat");
    }
  }

  // 8. Notifications
  await notificationRepo.create({
    recipientUserId: owner.id,
    title: "Xush kelibsiz!",
    message: "TransFlow Plan A boshqaruv paneliga xush kelibsiz. Tizim tayyor.",
    targetType: "system",
  });
}

/**
 * Generates N additional realistic orders for stress testing / pagination verification.
 */
export async function generateStressOrders(companyId: string, count = 30): Promise<void> {
  const cities = ["Toshkent", "Samarqand", "Buxoro", "Andijon", "Farg'ona", "Namangan", "Qarshi", "Nukus"];
  const goods = [
    "Qurilish materiallari",
    "Gipsokarton va bo'yoqlar",
    "Oziq-ovqat mahsulotlari",
    "Meva-sabzavotlar",
    "Polietilen granulalar",
    "Keramik plitkalar",
  ];

  for (let i = 1; i <= count; i++) {
    const origin = cities[Math.floor(Math.random() * cities.length)];
    let destination = cities[Math.floor(Math.random() * cities.length)];
    while (destination === origin) {
      destination = cities[Math.floor(Math.random() * cities.length)];
    }
    const cargo = goods[Math.floor(Math.random() * goods.length)];
    const weight = Math.floor(Math.random() * 20000) + 2000;

    await orderRepo.create({
      companyId,
      pickupAddress: `${origin}, Sanoat zonasi #${i}`,
      deliveryAddress: `${destination}, Markaziy ombor #${i}`,
      cargoDescription: cargo,
      weightKg: weight,
      deadline: new Date(Date.now() + (i + 1) * 12 * 3600 * 1000).toISOString(),
      customerName: `Mijoz #${i} MCHJ`,
      customerPhone: `+9989012345${(i % 100).toString().padStart(2, "0")}`,
      notes: `Avtomatik yaratilgan demo buyurtma #${i}`,
      driverId: null,
      vehicleId: null,
    });
  }
}
