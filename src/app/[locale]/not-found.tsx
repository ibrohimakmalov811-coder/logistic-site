import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="py-24 md:py-36 text-center">
      <div className="container mx-auto max-w-lg px-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6">
          <AlertCircle className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
          {t("desc")}
        </p>
        <div className="mt-8">
          <Link href="/">
            <Button variant="primary" size="md" className="gap-2">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{t("backHome")}</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
