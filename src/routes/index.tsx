import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import {
  AmbientBackground,
  HeroSection,
  TrustStrip,
  FeaturesSection,
  ShowcaseSection,
  SecuritySection,
  TestimonialsSection,
  DownloadSection,
  FooterSection,
} from "@/components/landing/LandingSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aurix — Messaging. Reimagined." },
      { name: "description", content: "Private, beautiful, instant messaging with on-device AI, cinematic themes, and vault-grade privacy. Built for 2026." },
      { property: "og:title", content: "Aurix — Messaging. Reimagined." },
      { property: "og:description", content: "The premium chat experience. AI smart replies, mood themes, hidden space, and cross-platform apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="relative min-h-screen bg-black text-white antialiased overflow-x-hidden">
      <AmbientBackground />
      <div className="relative z-10">
        <Navbar />
        <main>
          <HeroSection />
          <TrustStrip />
          <FeaturesSection />
          <ShowcaseSection />
          <SecuritySection />
          <TestimonialsSection />
          <DownloadSection />
        </main>
        <FooterSection />
      </div>
    </div>
  );
}
