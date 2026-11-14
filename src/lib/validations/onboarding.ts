import { z } from "zod";
import { normalizeUzPhone, UZ_PHONE_REGEX } from "./waitlist";
import { inviteCodeSchema } from "./auth";

export const personalInfoSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, { message: "validation.nameTooShort" })
    .max(100, { message: "validation.nameTooLong" })
    .regex(/^[a-zA-Z\u0400-\u04FF\s'`ʻʼ-]+$/, {
      message: "validation.nameInvalidChars",
    }),
  phone: z
    .string()
    .trim()
    .min(9, { message: "validation.phoneRequired" })
    .transform(normalizeUzPhone)
    .refine((val) => UZ_PHONE_REGEX.test(val), {
      message: "validation.phoneInvalidUz",
    }),
  preferredLanguage: z.enum(["uz", "ru", "en"], {
    errorMap: () => ({ message: "validation.langRequired" }),
  }),
});

export const ownerCompanyStepSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, { message: "validation.companyTooShort" })
    .max(120, { message: "validation.companyTooLong" }),
  legalForm: z.enum(["llc", "ie", "jsc", "other"], {
    errorMap: () => ({ message: "onboardingValidation.legalFormRequired" }),
  }),
  cityRegion: z
    .string()
    .trim()
    .min(2, { message: "onboardingValidation.cityRequired" })
    .max(80, { message: "onboardingValidation.cityTooLong" }),
  fleetSize: z.enum(["1-4", "5-15", "16-30", "30+"], {
    errorMap: () => ({ message: "validation.fleetRequired" }),
  }),
  mainCargoTypes: z
    .array(z.string().trim().min(1).max(60))
    .min(1, { message: "onboardingValidation.cargoTypesRequired" })
    .max(8, { message: "onboardingValidation.cargoTypesMax" }),
});

export const dispatcherJoinStepSchema = z.object({
  inviteCode: inviteCodeSchema,
});

export const driverDetailsStepSchema = z.object({
  inviteCode: inviteCodeSchema,
  licenseCategory: z.enum(["B", "C", "CE", "D", "BE"], {
    errorMap: () => ({ message: "onboardingValidation.licenseRequired" }),
  }),
  yearsExperience: z.coerce
    .number()
    .int()
    .min(0, { message: "onboardingValidation.experienceRange" })
    .max(60, { message: "onboardingValidation.experienceRange" }),
  vehicleType: z.enum(["tent", "refrigerator", "flatbed", "container", "van", "other"], {
    errorMap: () => ({ message: "onboardingValidation.vehicleTypeRequired" }),
  }),
  plateNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { message: "onboardingValidation.plateInvalid" })
    .max(20, { message: "onboardingValidation.plateInvalid" })
    .regex(/^[A-Z0-9\s-]{4,20}$/, { message: "onboardingValidation.plateInvalid" }),
  capacityKg: z.coerce
    .number()
    .int()
    .min(100, { message: "onboardingValidation.capacityRange" })
    .max(100000, { message: "onboardingValidation.capacityRange" }),
  vehicleRegion: z
    .string()
    .trim()
    .min(2, { message: "onboardingValidation.cityRequired" })
    .max(80, { message: "onboardingValidation.cityTooLong" }),
});

export const onboardingDraftSchema = z.object({
  step: z.number().int().min(1).max(3).optional(),
  fullName: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  preferredLanguage: z.enum(["uz", "ru", "en"]).optional(),
  companyName: z.string().max(120).optional(),
  legalForm: z.enum(["llc", "ie", "jsc", "other"]).optional(),
  cityRegion: z.string().max(80).optional(),
  fleetSize: z.enum(["1-4", "5-15", "16-30", "30+"]).optional(),
  mainCargoTypes: z.array(z.string().max(60)).max(8).optional(),
  inviteCode: z.string().max(32).optional(),
  licenseCategory: z.enum(["B", "C", "CE", "D", "BE"]).optional(),
  yearsExperience: z.coerce.number().min(0).max(60).optional(),
  vehicleType: z.enum(["tent", "refrigerator", "flatbed", "container", "van", "other"]).optional(),
  plateNumber: z.string().max(20).optional(),
  capacityKg: z.coerce.number().min(0).max(100000).optional(),
  vehicleRegion: z.string().max(80).optional(),
});

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type OwnerCompanyStepInput = z.infer<typeof ownerCompanyStepSchema>;
export type DispatcherJoinStepInput = z.infer<typeof dispatcherJoinStepSchema>;
export type DriverDetailsStepInput = z.infer<typeof driverDetailsStepSchema>;
export type OnboardingDraftInput = z.infer<typeof onboardingDraftSchema>;
