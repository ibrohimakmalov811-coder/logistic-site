"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Building2,
  ClipboardList,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Truck,
  User,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerUser, type UserRole } from "@/lib/storage-auth";
import { userRepo, companyRepo, inviteRepo, hashPassword } from "@/lib/data";
import { cn } from "@/lib/utils";

interface SignupFormProps {
  initialRole?: UserRole | null;
}

const ROLE_OPTIONS: Array<{
  role: UserRole;
  icon: typeof Building2;
  key: "owner" | "dispatcher" | "driver";
}> = [
  { role: "driver", icon: Truck, key: "driver" },
  { role: "company_owner", icon: Building2, key: "owner" },
  { role: "dispatcher", icon: ClipboardList, key: "dispatcher" },
];

export function SignupForm({ initialRole }: SignupFormProps) {
  const t = useTranslations("Auth.signup");
  const router = useRouter();

  const [role, setRole] = React.useState<UserRole>(initialRole ?? "driver");
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("+998 ");
  const [email, setEmail] = React.useState("");
  const [inviteCode, setInviteCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [acceptLegal, setAcceptLegal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get("invite");
      if (codeFromUrl) {
        setInviteCode(codeFromUrl);
      }
      const roleFromUrl = urlParams.get("role");
      if (roleFromUrl === "driver" || roleFromUrl === "dispatcher" || roleFromUrl === "company_owner") {
        setRole(roleFromUrl);
      }
    }
  }, []);

  const hasMinLen = password.length >= 8;
  const hasLetterAndDigit = /[A-Za-z]/.test(password) && /\d/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (fullName.trim().length < 2) {
      setErrorMessage(t("nameRequired"));
      return;
    }
    const cleanPhone = phone.replace(/[^\d+]/g, "");
    if (cleanPhone.length < 9) {
      setErrorMessage(t("phoneRequired"));
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setErrorMessage(t("passwordRuleError"));
      return;
    }
    if (!hasMinLen || !hasLetterAndDigit) {
      setErrorMessage(t("passwordRuleError"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("passwordMismatch"));
      return;
    }
    if (!acceptLegal) {
      setErrorMessage(t("legalRequired"));
      return;
    }

    if (role === "driver" || role === "dispatcher") {
      const trimmedCode = inviteCode.trim();
      if (!trimmedCode) {
        setErrorMessage(t("inviteCodeRequiredError"));
        return;
      }
      const inviteRegex = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/i;
      if (!inviteRegex.test(trimmedCode)) {
        setErrorMessage(t("inviteCodeFormatError"));
        return;
      }
      const check = await inviteRepo.validateInviteCode(trimmedCode, role);
      if (!check.valid) {
        setErrorMessage(check.error || t("inviteCodeRequiredError"));
        return;
      }
    }

    setSubmitting(true);
    try {
      const { passwordHash, salt } = await hashPassword(password);
      const cleanEmail = email.trim().toLowerCase();

      let createdUser;
      try {
        createdUser = await userRepo.create(
          {
            role,
            fullName: fullName.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            language: "uz",
            avatar: null,
          },
          passwordHash,
          salt
        );
      } catch (repoErr: unknown) {
        setErrorMessage(repoErr instanceof Error ? repoErr.message : "Ro'yxatdan o'tishda xatolik yuz berdi.");
        return;
      }

      // If invite code provided, redeem it
      if (role === "driver" || role === "dispatcher") {
        const redeemRes = await inviteRepo.verifyAndRedeemInvite(inviteCode.trim(), createdUser.id, role);
        if (!redeemRes.success) {
          await userRepo.delete(createdUser.id);
          setErrorMessage(redeemRes.error || t("inviteCodeRequiredError"));
          return;
        }
      } else if (role === "company_owner") {
        await companyRepo.create(createdUser.id, `${fullName.trim()} Logistika`, "Toshkent");
      }

      // Keep legacy storage-auth in sync
      registerUser({
        fullName,
        phone,
        email,
        role,
        password,
      });

      router.push("/login?registered=1");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. ENG BOSHI: Rol tanlash amali (Kompaniya egasi, Dispetcher, Haydovchi) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("chooseRolePrompt")}
        </label>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          role="radiogroup"
          aria-label={t("chooseRolePrompt")}
        >
          {ROLE_OPTIONS.map((item) => {
            const Icon = item.icon;
            const selected = role === item.role;
            return (
              <button
                key={item.role}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(item.role)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selected
                    ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                    : "border-border bg-card/60 hover:border-primary/40 hover:bg-secondary/40"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg p-2 shrink-0 transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                    {t(`roles.${item.key}.title`)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Taklif kodi (Haydovchi yoki dispetcher uchun majburiy) */}
      {(role === "driver" || role === "dispatcher") && (
        <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <label
            htmlFor="signup-invite"
            className="block text-xs font-semibold uppercase tracking-wider text-primary"
          >
            {t("inviteCodeLabel")} *
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-invite"
              type="text"
              placeholder={t("inviteCodePlaceholder")}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="pl-10 font-mono text-sm tracking-wider"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("inviteCodeHint")}
          </p>
        </div>
      )}

      {/* 2. KETMA-KET MAYDONLAR: F.I.Sh */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-name"
          className="block text-sm font-medium text-foreground"
        >
          {t("fullNameLabel")}
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-name"
            type="text"
            placeholder={t("fullNamePlaceholder")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* 3. Telefon raqami */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-phone"
          className="block text-sm font-medium text-foreground"
        >
          {t("phoneLabel")}
        </label>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-phone"
            type="tel"
            placeholder={t("phonePlaceholder")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 font-mono text-sm"
            required
          />
        </div>
      </div>

      {/* 4. Elektron pochta */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-email"
          className="block text-sm font-medium text-foreground"
        >
          {t("emailLabel")}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* 5. Parol */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-password"
          className="block text-sm font-medium text-foreground"
        >
          {t("passwordLabel")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("passwordRuleHint")}</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
          {t("temporaryPasswordHint")}
        </p>
      </div>

      {/* 7. Parolni tasdiqlash */}
      <div className="space-y-1.5">
        <label
          htmlFor="signup-confirm-password"
          className="block text-sm font-medium text-foreground"
        >
          {t("confirmPasswordLabel")}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* 8. Foydalanish shartlariga rozilik */}
      <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none pt-1">
        <input
          type="checkbox"
          checked={acceptLegal}
          onChange={(e) => setAcceptLegal(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
          required
        />
        <span>
          {t.rich("acceptLegalRich", {
            terms: (chunks) => (
              <span className="text-primary hover:underline font-medium">
                {chunks}
              </span>
            ),
            privacy: (chunks) => (
              <span className="text-primary hover:underline font-medium">
                {chunks}
              </span>
            ),
          })}
        </span>
      </label>

      {/* Xatolik xabari */}
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 9. Ro'yxatdan o'tish tugmasi */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        isLoading={submitting}
      >
        {t("submitButton")}
      </Button>

      {/* Kirish havolasi */}
      <p className="text-center text-sm text-muted-foreground pt-1">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
