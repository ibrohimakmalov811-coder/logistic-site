"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionItemProps {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function AccordionItem({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: AccordionItemProps) {
  const contentId = `faq-content-${id}`;
  const buttonId = `faq-btn-${id}`;

  return (
    <div className="border-b border-border/60 py-4 last:border-b-0">
      <h3>
        <button
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={onToggle}
          className="flex w-full items-center justify-between py-2 text-left text-base sm:text-lg font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-2"
        >
          <span>{question}</span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180 text-primary"
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out px-2",
          isOpen
            ? "grid-rows-[1fr] opacity-100 pt-2"
            : "grid-rows-[0fr] opacity-0 pointer-events-none"
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
