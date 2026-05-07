import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import {
  HeroSection,
  FeaturesSection,
  TestimonialsSection,
  FooterSection,
} from "@/components/landing/LandingSections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Chat That Feels Alive" },
      { name: "description", content: "AI-powered futuristic messaging with mood detection, cinematic themes, ghost mode, and vibes that evolve with your conversations." },
      { property: "og:title", content: "Aura — Chat That Feels Alive" },
      { property: "og:description", content: "The social app from 2030. AI smart replies, mood themes, ghost mode, and more." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <FooterSection />
    </div>
  );
}
