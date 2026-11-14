import crypto from "crypto";
import {
  generateBase32Secret,
  getDevDb,
  hashDevPassword,
  resetDevDb,
  saveDevDb,
} from "../src/lib/dev-store.ts";

if (process.env.NODE_ENV === "production") {
  console.error("[SECURITY] scripts/seed-dev.ts MUST NOT run in production.");
  process.exit(1);
}

function runSeed() {
  resetDevDb();
  const db = getDevDb();
  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();

  const ownerId = crypto.randomUUID();
  const dispatcherId = crypto.randomUUID();
  const driver1Id = crypto.randomUUID();
  const driver2Id = crypto.randomUUID();

  const passwordHash = hashDevPassword("SamplePass123!");
  const ownerSecret = generateBase32Secret();
  const dispatcherSecret = generateBase32Secret();

  db.users.push(
    {
      id: ownerId,
      email: "owner@sample-trans.local",
      passwordHash,
      emailVerified: true,
      role: "company_owner",
      totpSecret: ownerSecret,
      totpVerified: true,
      onboardingDraft: null,
      createdAt: now,
    },
    {
      id: dispatcherId,
      email: "dispatcher@sample-trans.local",
      passwordHash,
      emailVerified: true,
      role: "dispatcher",
      totpSecret: dispatcherSecret,
      totpVerified: true,
      onboardingDraft: null,
      createdAt: now,
    },
    {
      id: driver1Id,
      email: "driver1@sample-trans.local",
      passwordHash,
      emailVerified: true,
      role: "driver",
      totpSecret: null,
      totpVerified: false,
      onboardingDraft: null,
      createdAt: now,
    },
    {
      id: driver2Id,
      email: "driver2@sample-trans.local",
      passwordHash,
      emailVerified: true,
      role: "driver",
      totpSecret: null,
      totpVerified: false,
      onboardingDraft: null,
      createdAt: now,
    }
  );

  db.profiles.push(
    {
      id: ownerId,
      role: "company_owner",
      preferred_language: "uz",
      full_name: "[Sample data] Sardorbek Alimov",
      phone: "+998901112233",
      onboarding_completed: true,
      onboarding_draft: null,
      deletion_requested_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: dispatcherId,
      role: "dispatcher",
      preferred_language: "ru",
      full_name: "[Sample data] Madina Rustamova",
      phone: "+998902223344",
      onboarding_completed: true,
      onboarding_draft: null,
      deletion_requested_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: driver1Id,
      role: "driver",
      preferred_language: "uz",
      full_name: "[Sample data] Jamshid Tursunov",
      phone: "+998933334455",
      onboarding_completed: true,
      onboarding_draft: null,
      deletion_requested_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: driver2Id,
      role: "driver",
      preferred_language: "uz",
      full_name: "[Sample data] Dilshod Rahimov",
      phone: "+998974445566",
      onboarding_completed: true,
      onboarding_draft: null,
      deletion_requested_at: null,
      created_at: now,
      updated_at: now,
    }
  );

  db.companies.push({
    id: companyId,
    owner_id: ownerId,
    name: "[Sample data] Baraka Karvon Logistika",
    legal_form: "llc",
    city_region: "Toshkent",
    fleet_size: "5-15",
    main_cargo_types: ["FMCG", "ichimliklar", "qurilish mollari"],
    created_at: now,
    updated_at: now,
  });

  db.companyMembers.push(
    {
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: ownerId,
      role: "company_owner",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: dispatcherId,
      role: "dispatcher",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: driver1Id,
      role: "driver",
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      id: crypto.randomUUID(),
      company_id: companyId,
      user_id: driver2Id,
      role: "driver",
      is_active: true,
      created_at: now,
      updated_at: now,
    }
  );

  const vehicle1Id = crypto.randomUUID();
  const vehicle2Id = crypto.randomUUID();

  db.vehicles.push(
    {
      id: vehicle1Id,
      company_id: companyId,
      vehicle_type: "van",
      plate_number: "01 A 774 KA",
      capacity_kg: 5500,
      region: "Toshkent",
      status: "on_trip",
      created_at: now,
      updated_at: now,
    },
    {
      id: vehicle2Id,
      company_id: companyId,
      vehicle_type: "tent",
      plate_number: "01 B 512 DA",
      capacity_kg: 20000,
      region: "Toshkent",
      status: "available",
      created_at: now,
      updated_at: now,
    }
  );

  db.driverProfiles.push(
    {
      user_id: driver1Id,
      company_id: companyId,
      license_category: "C",
      years_experience: 6,
      primary_vehicle_id: vehicle1Id,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
    {
      user_id: driver2Id,
      company_id: companyId,
      license_category: "CE",
      years_experience: 9,
      primary_vehicle_id: vehicle2Id,
      is_active: true,
      created_at: now,
      updated_at: now,
    }
  );

  const order1Id = crypto.randomUUID();
  const order2Id = crypto.randomUUID();
  const order3Id = crypto.randomUUID();
  const order4Id = crypto.randomUUID();

  db.orders.push(
    {
      id: order1Id,
      company_id: companyId,
      order_number: "TF-1001",
      status: "in_transit",
      pickup_address: "Toshkent, Sergeli tumani, Logistika markazi 14",
      delivery_address: "Samarqand, Spitamen shoh ko'chasi 88",
      cargo_description: "[Sample data] Qadoqlangan ichimliklar (pallet)",
      weight_kg: 4200,
      price_uzs: 3400000,
      deadline_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      customer_name: "[Sample data] Samarqand Savdo MCHJ",
      customer_phone: "+998905551122",
      notes: "Sample data for development",
      assigned_driver_id: driver1Id,
      assigned_vehicle_id: vehicle1Id,
      created_by: dispatcherId,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: order2Id,
      company_id: companyId,
      order_number: "TF-1002",
      status: "assigned",
      pickup_address: "Toshkent, Bektemir tumani, Ombor #4",
      delivery_address: "Farg'ona, Mustaqillik ko'chasi 21",
      cargo_description: "[Sample data] Maishiy kimyo mahsulotlari",
      weight_kg: 12000,
      price_uzs: 4800000,
      deadline_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      customer_name: "[Sample data] Vodiy Distribyutsiya",
      customer_phone: "+998916667788",
      notes: null,
      assigned_driver_id: driver2Id,
      assigned_vehicle_id: vehicle2Id,
      created_by: ownerId,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: order3Id,
      company_id: companyId,
      order_number: "TF-1003",
      status: "delivered",
      pickup_address: "Buxoro, Sanoat zonasi 3-blok",
      delivery_address: "Navoiy, Xalqlar do'stligi ko'chasi 9",
      cargo_description: "[Sample data] Qadoqlangan oziq-ovqat",
      weight_kg: 3800,
      price_uzs: 2100000,
      deadline_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      customer_name: "[Sample data] Navoiy Retail",
      customer_phone: "+998937778899",
      notes: null,
      assigned_driver_id: driver1Id,
      assigned_vehicle_id: vehicle1Id,
      created_by: dispatcherId,
      delivered_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      created_at: now,
      updated_at: now,
    },
    {
      id: order4Id,
      company_id: companyId,
      order_number: "TF-1004",
      status: "new",
      pickup_address: "Toshkent, Chilonzor ulgurji bozori",
      delivery_address: "Andijon, Bobur shoh ko'chasi 45",
      cargo_description: "[Sample data] Qadoq qog'oz va karton",
      weight_kg: 8500,
      price_uzs: 4200000,
      deadline_at: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      customer_name: "[Sample data] Sharq Invest",
      customer_phone: "+998948889900",
      notes: null,
      assigned_driver_id: null,
      assigned_vehicle_id: null,
      created_by: dispatcherId,
      delivered_at: null,
      created_at: now,
      updated_at: now,
    }
  );

  saveDevDb();

  console.log("[Sample data] Local dev sandbox seeded:");
  console.log("  Owner:      owner@sample-trans.local / SamplePass123!");
  console.log("  Dispatcher: dispatcher@sample-trans.local / SamplePass123!");
  console.log("  Driver 1:   driver1@sample-trans.local / SamplePass123!");
  console.log("  Driver 2:   driver2@sample-trans.local / SamplePass123!");
}

runSeed();
