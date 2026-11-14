import { Footer } from "@/components/Footer";
import { HealthWorkers } from "@/components/HealthWorkers";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { PartnerForm } from "@/components/PartnerForm";
import { Services } from "@/components/Services";
import { StickyHeader } from "@/components/StickyHeader";
import { TrySafety } from "@/components/TrySafety";

export default function Home() {
  return (
    <>
      <StickyHeader />
      <main>
        <Hero />
        <Services />
        <HealthWorkers />
        <HowItWorks />
        <TrySafety />
        <PartnerForm />
      </main>
      <Footer />
    </>
  );
}
