"use client";

import * as React from "react";
import { Check, Copy, KeyRound, Loader2, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { InviteEntity, inviteRepo, syncChannel } from "@/lib/data";

interface CompanyInvitesViewProps {
  companyId: string;
  createdByUserId: string;
}

export function CompanyInvitesView({ companyId, createdByUserId }: CompanyInvitesViewProps) {
  const locale = useLocale();
  const [invites, setInvites] = React.useState<InviteEntity[]>([]);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [role, setRole] = React.useState<"driver" | "dispatcher">("driver");
  const [expiresInDays, setExpiresInDays] = React.useState(7);
  const [isCreating, setIsCreating] = React.useState(false);

  // New generated code display state
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const loadInvites = React.useCallback(async () => {
    const list = await inviteRepo.listByCompany(companyId);
    setInvites(list);
  }, [companyId]);

  React.useEffect(() => {
    loadInvites();

    const unsubscribe = syncChannel.subscribe((msg) => {
      if (
        msg.type === "INVITE_CREATED" ||
        msg.type === "INVITE_REDEEMED" ||
        msg.type === "INVITE_REVOKED" ||
        msg.type === "STORAGE_RESET"
      ) {
        loadInvites();
      }
    });

    return () => unsubscribe();
  }, [loadInvites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await inviteRepo.createInvite(companyId, createdByUserId, role, expiresInDays);
      setGeneratedCode(res.rawCode);
      await loadInvites();
    } catch (err) {
      console.error("Failed to create invite:", err);
      alert("Taklif kodi yaratishda xatolik yuz berdi.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!window.confirm("Haqiqatan ham bu taklifnomani bekor qilmoqchimisiz?")) {
      return;
    }
    await inviteRepo.revokeInvite(inviteId, companyId);
    await loadInvites();
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/${locale}/signup?invite=${encodeURIComponent(code)}&role=${role}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusBadge = (inv: InviteEntity) => {
    if (inv.revokedAt) {
      return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
          Bekor qilingan
        </span>
      );
    }
    if (inv.usedAt) {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
          Ishlatilgan
        </span>
      );
    }
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      return (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {"Muddati o'tgan"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        Faol
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading">
            Kompaniyaga taklif kodlari
          </h2>
          <p className="text-xs text-muted-foreground">
            {"O'z haydovchilaringiz va dispetcherlaringizni tizimga xavfsiz ulash"}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => {
            setGeneratedCode(null);
            setModalOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Yangi taklif yaratish
        </Button>
      </div>

      {/* Invites List */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Taklif kodi</th>
                <th className="px-4 py-3">Roli</th>
                <th className="px-4 py-3">Amal qilish muddati</th>
                <th className="px-4 py-3">Holati</th>
                <th className="px-4 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {invites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {"Hozircha yaratilgan taklif kodlari yo'q."}
                  </td>
                </tr>
              ) : (
                invites.map((inv) => {
                  const isActive =
                    !inv.usedAt && !inv.revokedAt && new Date(inv.expiresAt).getTime() > Date.now();
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {inv.codePreview}
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize font-medium">
                          {inv.role === "driver" ? "Haydovchi" : "Dispetcher"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(inv)}</td>
                      <td className="px-4 py-3 text-right">
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-destructive hover:underline font-medium"
                          >
                            <Trash2 className="h-3 w-3" />
                            Bekor qilish
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold font-heading">
                {generatedCode ? "Taklif kodi tayyor" : "Yangi taklif kodi yaratish"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatedCode ? (
              <div className="space-y-4 mt-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Ushbu kodni haydovchi yoki dispetcherga yuboring:
                  </p>
                  <div className="text-2xl font-mono font-bold tracking-widest text-emerald-700 dark:text-emerald-300 py-1">
                    {generatedCode}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Amal qilish muddati: {expiresInDays} kun • Bir martalik
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => handleCopyCode(generatedCode)}
                  >
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedCode ? "Nusxalandi!" : "Kodni nusxalash"}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => handleCopyLink(generatedCode)}
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <KeyRound className="h-3.5 w-3.5" />}
                    {copiedLink ? "Havola nusxalandi!" : "Havolani nusxalash"}
                  </Button>
                </div>

                <div className="rounded-xl bg-muted/50 p-3 text-[11px] text-muted-foreground flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>
                    {"Xavfsizlik talabiga ko'ra to'liq kod faqat shu yerda bir marta ko'rsatiladi. Kod ro'yxatda faqat qisqartirilgan holda saqlanadi."}
                  </span>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button size="sm" onClick={() => setModalOpen(false)}>
                    Tushunarli, yopish
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Roli
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "driver" | "dispatcher")}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="driver">Haydovchi (Driver)</option>
                    <option value="dispatcher">Dispetcher (Dispatcher)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amal qilish muddati
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value={1}>1 kun</option>
                    <option value={3}>3 kun</option>
                    <option value={7}>7 kun (Standart)</option>
                    <option value={14}>14 kun</option>
                    <option value={30}>30 kun</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" size="sm" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Yaratilmoqda...
                      </>
                    ) : (
                      "Kodni yaratish"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
