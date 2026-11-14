"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { AccordionItem } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FaqSection() {
  const t = useTranslations("faq");
  const [openId, setOpenId] = React.useState<string | null>("q1");

  const faqs = [
    { id: "q1", question: t("q1"), answer: t("a1") },
    { id: "q2", question: t("q2"), answer: t("a2") },
    { id: "q3", question: t("q3"), answer: t("a3") },
    { id: "q4", question: t("q4"), answer: t("a4") },
    { id: "q5", question: t("q5"), answer: t("a5") },
    { id: "q6", question: t("q6"), answer: t("a6") },
    { id: "q7", question: t("q7"), answer: t("a7") },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-card/20 border-t border-border/50">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center mb-14">
          <Badge variant="default" className="mb-4">
            <HelpCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h2 className="font-heading text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {t("title")}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Accordion container */}
        <div className="rounded-3xl border border-border/70 bg-card/95 p-6 sm:p-10 shadow-lg">
          {faqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              id={faq.id}
              question={faq.question}
              answer={faq.answer}
              isOpen={openId === faq.id}
              onToggle={() => setOpenId((prev) => (prev === faq.id ? null : faq.id))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
