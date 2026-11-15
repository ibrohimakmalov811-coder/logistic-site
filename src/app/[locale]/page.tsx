import { getTranslations, setRequestLocale } from "next-intl/server";
import { type Locale } from "@/i18n/routing";
import { HeroSection } from "@/components/sections/hero-section";
import { ProblemSection } from "@/components/sections/problem-section";
import { HowItWorksSection } from "@/components/sections/how-it-works-section";
import { FeaturesSection } from "@/components/sections/features-section";
import { BackhaulSection } from "@/components/sections/backhaul-section";
import { WhoIsItForSection } from "@/components/sections/who-is-it-for-section";
import { ProductPreviewSection } from "@/components/sections/product-preview-section";
import { EarlyAccessTeaserSection } from "@/components/sections/early-access-teaser-section";
import { SocialProofPlaceholder } from "@/components/sections/social-proof-placeholder";
import { FaqSection } from "@/components/sections/faq-section";
import { CtaBannerSection } from "@/components/sections/cta-banner-section";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: tFaq("q1"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a1"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q2"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a2"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q3"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a3"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q4"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a4"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q5"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a5"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q6"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a6"),
        },
      },
      {
        "@type": "Question",
        name: tFaq("q7"),
        acceptedAnswer: {
          "@type": "Answer",
          text: tFaq("a7"),
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* 2. Hero Section with Mockup and CTAs */}
      <HeroSection />

      {/* 3. Problem Section with Verified Stats & Before/After */}
      <ProblemSection />

      {/* 4. How It Works: 3 Steps with Connecting Line */}
      <HowItWorksSection />

      {/* 5. Features Grid: 6 Core Capabilities */}
      <FeaturesSection />

      {/* 6. Backhaul Highlight: Empty Return Trips & Matching */}
      <BackhaulSection />

      {/* 7. Who It Is For: Fleets, Dispatchers, FMCG */}
      <WhoIsItForSection />

      {/* 8. Product Preview: Tabbed Showcase of Concept Screens */}
      <ProductPreviewSection />

      {/* 9. Early Access Teaser & Waitlist Form */}
      <EarlyAccessTeaserSection />

      {/* 10. Social Proof Placeholder: Honest "Coming Soon" Block */}
      <SocialProofPlaceholder />

      {/* 11. FAQ: Accessible Accordion */}
      <FaqSection />

      {/* 12. Final CTA Band with Form */}
      <CtaBannerSection />
    </>
  );
}
