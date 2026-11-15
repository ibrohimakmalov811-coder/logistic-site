"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  LogOut,
  Plus,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addUserActivity,
  getCurrentUser,
  logoutUser,
  type LocalUser,
  type UserActivity,
} from "@/lib/storage-auth";
import { cn } from "@/lib/utils";
import { DemoNoticeAlert } from "@/components/common/demo-notice-alert";

export function CabinetView() {
  const t = useTranslations("Cabinet");
  const router = useRouter();

  const [user, setUser] = React.useState<LocalUser | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "order" | "request" | "action"
  >("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // New activity form state
  const [newType, setNewType] = React.useState<"order" | "request" | "action">("order");
  const [newTitle, setNewTitle] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<"in_transit" | "pending" | "completed">("in_transit");

  React.useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  const handleLogout = () => {
    logoutUser();
    router.replace("/login");
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    const created = addUserActivity(user.id, {
      type: newType,
      title: newTitle.trim(),
      description: newDesc.trim() || "Yangi qayd etilgan faoliyat ma'lumoti.",
      status: newStatus,
    });

    if (created) {
      setUser(getCurrentUser());
      setNewTitle("");
      setNewDesc("");
      setIsModalOpen(false);
    }
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activities = user.activities || [];
  const filteredActivities = activities.filter((item) => {
    if (activeFilter === "all") return true;
    return item.type === activeFilter;
  });

  const ordersCount = activities.filter((a) => a.type === "order").length;
  const requestsCount = activities.filter((a) => a.type === "request").length;
  const actionsCount = activities.filter((a) => a.type === "action" || a.type === "login" || a.type === "profile_update").length;

  const getActivityIcon = (type: UserActivity["type"]) => {
    switch (type) {
      case "order":
        return <Truck className="h-5 w-5 text-primary" />;
      case "request":
        return <FileText className="h-5 w-5 text-amber-500" />;
      case "profile_update":
        return <User className="h-5 w-5 text-purple-500" />;
      case "login":
        return <ShieldCheck className="h-5 w-5 text-emerald-500" />;
      default:
        return <Activity className="h-5 w-5 text-sky-500" />;
    }
  };

  const getStatusBadge = (status?: UserActivity["status"]) => {
    switch (status) {
      case "completed":
      case "success":
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t("statusCompleted")}
          </span>
        );
      case "in_transit":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
            <Clock className="h-3 w-3 animate-spin" style={{ animationDuration: "6s" }} />
            {t("statusInTransit")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            <Clock className="h-3 w-3" />
            {t("statusPending")}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 sm:px-6 lg:px-8 py-3.5 shadow-sm">
        <div className="container mx-auto max-w-7xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="hidden sm:inline-block h-5 w-[1px] bg-border" />
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("title")}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />
            <LanguageSwitcher align="right" />

            {/* STEP 4: Button/link to Personal Information page */}
            <Link
              href="/personal-info"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <User className="h-4 w-4" />
              <span>{t("personalInfoButton")}</span>
            </Link>

            {/* STEP 3: Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 px-3 py-2 text-xs sm:text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              title={t("logoutButton")}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">{t("logoutButton")}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
        <DemoNoticeAlert />
      </div>

      {/* Main Cabinet Content */}
      <main className="container mx-auto max-w-7xl flex-1 px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header (STRICT: NO PERSONAL DATA SHOWN) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-heading">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t("newActivityButton")}</span>
            </Button>
          </div>
        </div>

        {/* Activity Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("totalActivities")}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                {activities.length}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("ordersCount")}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-primary font-mono">
                {ordersCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Truck className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("requestsCount")}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-500 font-mono">
                {requestsCount}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Boxes className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Activity Feed Section */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">
                {t("activityHistoryTitle")}
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-secondary/50 border border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                  activeFilter === "all"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("filterAll")} ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("order")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                  activeFilter === "order"
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("filterOrders")} ({ordersCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("request")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                  activeFilter === "request"
                    ? "bg-card text-amber-500 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("filterRequests")} ({requestsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("action")}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-semibold transition-colors",
                  activeFilter === "action"
                    ? "bg-card text-sky-500 shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t("filterActions")} ({actionsCount})
              </button>
            </div>
          </div>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm">{t("noActivity")}</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredActivities.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="rounded-xl p-2.5 bg-card border border-border/80 shrink-0">
                      {getActivityIcon(item.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                      <p className="text-[11px] font-mono text-muted-foreground/75 mt-1">
                        {new Date(item.timestamp).toLocaleString("uz-UZ", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    {getStatusBadge(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal for adding a new user activity */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-lg text-foreground">
                {t("modalTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  {t("modalTypeLabel")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType("order")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium border text-center transition-colors",
                      newType === "order"
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    {t("typeOrder")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("request")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium border text-center transition-colors",
                      newType === "request"
                        ? "border-amber-500 bg-amber-500/10 text-amber-500 font-bold"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    {t("typeRequest")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType("action")}
                    className={cn(
                      "py-2 rounded-xl text-xs font-medium border text-center transition-colors",
                      newType === "action"
                        ? "border-sky-500 bg-sky-500/10 text-sky-500 font-bold"
                        : "border-border bg-secondary/30 text-muted-foreground"
                    )}
                  >
                    {t("typeAction")}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  {t("modalTitleLabel")}
                </label>
                <Input
                  type="text"
                  placeholder="Masalan: Reys #TRK-2081: Toshkent → Namangan"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  {t("modalDescLabel")}
                </label>
                <Input
                  type="text"
                  placeholder="Yuk holati yoki operatsiya tafsilotlari"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  {t("modalCancel")}
                </Button>
                <Button type="submit" variant="primary">
                  {t("modalSubmit")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
