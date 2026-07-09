import LeadForm from "@/components/leads/LeadForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F6F2]">
      <div className="bg-[#0B1120] px-6 py-10 text-center">
        <div className="text-3xl">✨</div>
        <h1 className="mt-2 text-xl font-bold text-white">Bombshelled Aesthetics</h1>
        <p className="mt-1 text-sm text-[#6B7A99]">
          Explore your aesthetic options. We&apos;ll text you within minutes to schedule your consultation.
        </p>
      </div>

      <div className="mx-auto max-w-md px-6 py-8">
        <LeadForm />
      </div>
    </main>
  );
}
