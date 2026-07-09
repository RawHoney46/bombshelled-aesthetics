import type { Metadata } from "next";
import LeadForm from "@/components/leads/LeadForm";

export const metadata: Metadata = {
  title: "Bombshelled Aesthetics — Consultation Request",
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F3EC]">
      <div className="bg-[#1C1710] px-6 py-10 text-center">
        <h1 className="text-xl font-bold uppercase tracking-widest text-[#C4A15A] [font-family:var(--font-playfair)]">Bombshelled Aesthetics</h1>
        <p className="mt-1 text-sm text-[#9C8E76]">
          Explore your aesthetic options. We&apos;ll text you within minutes to schedule your consultation.
        </p>
      </div>

      <div className="mx-auto max-w-md px-6 py-8">
        <LeadForm />
        <p className="mt-6 text-center text-xs text-neutral-400">
          Demonstration only — all patient data in this system is fictional.
        </p>
      </div>
    </main>
  );
}
