export type RoleOption = "owner" | "dispatcher" | "driver" | "other";
export type FleetSizeOption = "1-4" | "5-15" | "16-30" | "30+";
export type PreferredLangOption = "uz" | "ru" | "en";

export interface WaitlistSubmission {
  fullName: string;
  phone: string;
  companyName: string;
  role: RoleOption;
  fleetSize: FleetSizeOption;
  preferredLanguage: PreferredLangOption;
  consent: boolean;
  turnstileToken?: string;
  // Honeypot field
  hp_company_website?: string;
}

export interface WaitlistRecord extends WaitlistSubmission {
  id: string;
  createdAt: string;
  ipAddressHash?: string;
}

export type ActionResponse<T = unknown> =
  | {
      success: true;
      message: string;
      data?: T;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Partial<Record<keyof WaitlistSubmission, string[]>>;
    };
