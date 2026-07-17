"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { isValidName, isValidPhone, isValidEmail, isValidTravelCity } from "@/lib/validation/lead";
import type { Lead, ProcedureCategory, SurgicalInterest, NonSurgicalInterest, SpecificInterest } from "@/types";

const SURGICAL_INTERESTS: SurgicalInterest[] = [
  'breast-augmentation', 'breast-lift', 'breast-reduction', 'breast-revision',
  'tummy-tuck', 'liposuction', 'bbl', 'facelift', 'eyelid-surgery',
  'rhinoplasty', 'body-contouring', 'revision-surgery', 'other-surgical',
];

const NON_SURGICAL_INTERESTS: NonSurgicalInterest[] = [
  'filler', 'microdermabrasion', 'skin-rejuvenation', 'other-nonsurgical',
];

function formatInterestLabel(interest: string): string {
  if (interest === 'bbl') return 'BBL';

  return interest
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface LeadFormProps {
  onSuccess?: (lead: Lead) => void;
}

export default function LeadForm({ onSuccess }: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [procedureCategory, setProcedureCategory] = useState<ProcedureCategory | "">("");
  const [specificInterest, setSpecificInterest] = useState<SpecificInterest | "">("");
  const [timeline, setTimeline] = useState<"ready-to-book" | "exploring" | "just-researching" | "">("");
  const [patientLocation, setPatientLocation] = useState<"local" | "out-of-town" | "">("");
  const [travelOriginCity, setTravelOriginCity] = useState("");
  const [needsTravelLogistics, setNeedsTravelLogistics] = useState(false);
  const [consultationPreference, setConsultationPreference] = useState<"in-person" | "virtual" | "">("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setProcedureCategory("");
    setSpecificInterest("");
    setTimeline("");
    setPatientLocation("");
    setTravelOriginCity("");
    setNeedsTravelLogistics(false);
    setConsultationPreference("");
    setNotes("");
  };

  const handleProcedureCategoryChange = (category: ProcedureCategory | "") => {
    setProcedureCategory(category);
    setSpecificInterest("");
  };

  const getValidInterests = (): SpecificInterest[] => {
    if (procedureCategory === "surgical") return SURGICAL_INTERESTS as SpecificInterest[];
    if (procedureCategory === "non-surgical") return NON_SURGICAL_INTERESTS as SpecificInterest[];
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim() || !procedureCategory || !specificInterest || !timeline || !patientLocation || !consultationPreference) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isValidName(name)) {
      setError("Please enter a valid name.");
      return;
    }

    if (!isValidPhone(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (email.trim() && !isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (patientLocation === "out-of-town" && !travelOriginCity.trim()) {
      setError("Please enter your city of origin.");
      return;
    }

    if (patientLocation === "out-of-town" && !isValidTravelCity(travelOriginCity)) {
      setError("Please enter a valid city name.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        procedure_category: procedureCategory,
        specific_interest: specificInterest,
        timeline,
        patient_location: patientLocation,
        consultation_preference: consultationPreference,
      };

      if (patientLocation === "out-of-town") {
        payload.travel_origin_city = travelOriginCity.trim();
        payload.needs_travel_logistics = needsTravelLogistics ? 1 : 0;
      }

      if (notes.trim()) {
        payload.notes = notes.trim();
      }

      const lead = await apiFetch<Lead>("/api/leads", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccess(true);
      resetForm();
      onSuccess?.(lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-[#C0DD97] bg-[#EAF3DE] p-8 text-center">
        <div className="text-4xl">✅</div>
        <p className="mt-3 text-lg font-bold text-[#3B6D11]">Request received</p>
        <p className="mt-1 text-sm text-[#5A9A30]">
          We&apos;ll text you shortly to confirm details and find a time for your consultation.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-5 rounded-lg border border-[#C0DD97] bg-white px-4 py-2 text-sm font-medium text-[#3B6D11] transition hover:bg-[#F4F9EC]"
        >
          Submit another request
        </button>
      </div>
    );
  }

  // noValidate: we show validation errors in our own banner instead of the
  // browser's native bubbles (type="email"/"tel" still give mobile users the
  // right keyboard).
  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-[#EEEBE5] bg-white p-6">
      {error && (
        <div className="mb-4 rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-2.5 text-sm text-[#A32D2D]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Full name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Phone *</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(214) 555-0000"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Email</label>
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@email.com"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Interest type *</label>
          <select
            value={procedureCategory}
            onChange={(e) => handleProcedureCategoryChange(e.target.value as ProcedureCategory | "")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          >
            <option value="">Select...</option>
            <option value="surgical">Surgical</option>
            <option value="non-surgical">Non-surgical</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Specific interest *</label>
          <select
            value={specificInterest}
            onChange={(e) => setSpecificInterest(e.target.value as SpecificInterest | "")}
            disabled={!procedureCategory}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            <option value="">Select...</option>
            {getValidInterests().map((interest) => (
              <option key={interest} value={interest}>
                {formatInterestLabel(interest)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Timeline *</label>
          <select
            value={timeline}
            onChange={(e) => setTimeline(e.target.value as "ready-to-book" | "exploring" | "just-researching" | "")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          >
            <option value="">Select...</option>
            <option value="ready-to-book">Ready to book</option>
            <option value="exploring">Exploring options</option>
            <option value="just-researching">Just researching</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Location *</label>
          <select
            value={patientLocation}
            onChange={(e) => setPatientLocation(e.target.value as "local" | "out-of-town" | "")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          >
            <option value="">Select...</option>
            <option value="local">Local (Frisco area)</option>
            <option value="out-of-town">Out of town</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Consultation type *</label>
          <select
            value={consultationPreference}
            onChange={(e) => setConsultationPreference(e.target.value as "in-person" | "virtual" | "")}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          >
            <option value="">Select...</option>
            <option value="in-person">In-person</option>
            <option value="virtual">Virtual</option>
          </select>
        </div>

        {patientLocation === "out-of-town" && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-600">City of origin *</label>
              <input
                value={travelOriginCity}
                onChange={(e) => setTravelOriginCity(e.target.value)}
                placeholder="Dallas, TX"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="travel-logistics"
                checked={needsTravelLogistics}
                onChange={(e) => setNeedsTravelLogistics(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              <label htmlFor="travel-logistics" className="text-sm text-neutral-600">
                I need help with travel arrangements
              </label>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-neutral-600">Additional notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else you'd like us to know?"
            rows={3}
            className="w-full resize-y rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-[#1C1710] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2A2318] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Schedule a consultation →"}
      </button>

      <p className="mt-3 text-center text-xs text-neutral-400">
        We&apos;ll text you within minutes to confirm your details and find a time.
      </p>
    </form>
  );
}
