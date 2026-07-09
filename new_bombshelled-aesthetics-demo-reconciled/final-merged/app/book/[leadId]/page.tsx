"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import CalendarPicker from "@/components/booking/CalendarPicker";
import SMSThread from "@/components/sms/SMSThread";
import ScoreBadge from "@/components/leads/ScoreBadge";
import type { Appointment, CalendarSlot, Lead } from "@/types";

export default function BookLeadPage() {
  const params = useParams<{ leadId: string }>();
  const router = useRouter();
  const leadId = params.leadId;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [leadError, setLeadError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [consultationType, setConsultationType] = useState<"in-person" | "virtual" | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);
  const [qualifying, setQualifying] = useState(false);
  const [qualifyError, setQualifyError] = useState<string | null>(null);
  const [qualifyDegraded, setQualifyDegraded] = useState(false);

  useEffect(() => {
    async function loadLead() {
      setLoadingLead(true);
      setLeadError(null);
      try {
        // No single-lead GET route is defined in the contract,
        // so we pull the full list and find this lead by id.
        const data = await apiFetch<{ leads: Lead[] }>("/api/leads");
        const match = data.leads.find((l) => l.id === leadId) ?? null;
        if (!match) {
          setLeadError("Lead not found.");
        } else {
          setLead(match);
        }
      } catch (err) {
        setLeadError(err instanceof Error ? err.message : "Could not load lead.");
      } finally {
        setLoadingLead(false);
      }
    }

    if (leadId) loadLead();
  }, [leadId]);

  const handleConfirm = async () => {
    if (!selectedSlot || !consultationType || booking) return;
    setBooking(true);
    setBookingError(null);
    try {
      const result = await apiFetch<Appointment>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          lead_id: leadId,
          slot_date: selectedSlot.date,
          slot_time: selectedSlot.time,
          consultation_type: consultationType,
        }),
      });
      setAppointment(result);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not book this slot.");
    } finally {
      setBooking(false);
    }
  };

  const handleRecalcScore = async () => {
    if (!lead || recalculating) return;
    setRecalculating(true);
    setRecalcError(null);
    try {
      const result = await apiFetch<{ lead: Lead; score: number }>(`/api/leads/${leadId}/score`, {
        method: "POST",
      });
      setLead({ ...lead, score: result.score });
    } catch (err) {
      setRecalcError(err instanceof Error ? err.message : "Could not recalculate score.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleQualifyLead = async () => {
    if (!lead || qualifying) return;
    setQualifying(true);
    setQualifyError(null);
    setQualifyDegraded(false);
    try {
      const result = await apiFetch<{ lead: Lead; qualification: any | null; first_sms: any | null }>(
        `/api/leads/${leadId}/qualify`,
        { method: "POST" }
      );
      setLead(result.lead);
      // Distinguish between full success and AI-unavailable case
      if (result.qualification === null) {
        setQualifyDegraded(true);
      }
    } catch (err) {
      setQualifyError(err instanceof Error ? err.message : "Could not qualify lead.");
    } finally {
      setQualifying(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F6F2]">
      <div className="flex items-center gap-3 border-b border-[#F0EDE8] bg-[#FAFAF8] px-6 py-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-lg text-neutral-400 transition hover:text-neutral-600"
          aria-label="Back to dashboard"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-neutral-900">Book appointment</h1>
          {lead && <p className="text-sm text-neutral-500">{lead.name}</p>}
        </div>
        {lead && (
          <div className="ml-auto flex items-center gap-2">
            <ScoreBadge score={lead.score} />
            <button
              onClick={handleRecalcScore}
              disabled={recalculating}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition border border-neutral-200 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recalculating ? "Recalc..." : "Recalc"}
            </button>
            <button
              onClick={handleQualifyLead}
              disabled={qualifying}
              className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition border border-neutral-200 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {qualifying ? "Qualify..." : "Qualify"}
            </button>
          </div>
        )}
      </div>
      {recalcError && (
        <div className="border-b border-[#F09595] bg-[#FCEBEB] px-6 py-3 text-sm text-[#A32D2D]">
          {recalcError}
        </div>
      )}
      {qualifyError && (
        <div className="border-b border-[#F09595] bg-[#FCEBEB] px-6 py-3 text-sm text-[#A32D2D]">
          {qualifyError}
        </div>
      )}
      {qualifyDegraded && (
        <div className="border-b border-[#E8D4A0] bg-[#FFFDF5] px-6 py-3 text-sm text-[#6B5B2D]">
          Status updated — AI summary unavailable
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-8">
        {loadingLead && (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-xl bg-white" />
            <div className="h-40 animate-pulse rounded-xl bg-white" />
          </div>
        )}

        {!loadingLead && leadError && (
          <div className="rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-3 text-sm text-[#A32D2D]">
            {leadError}
          </div>
        )}

        {!loadingLead && lead && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-neutral-400">Phone</p>
                  <p className="mt-0.5 font-medium text-neutral-800">{lead.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Interest type</p>
                  <p className="mt-0.5 font-medium capitalize text-neutral-800">{lead.procedure_category}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Timeline</p>
                  <p className="mt-0.5 font-medium capitalize text-neutral-800">{lead.timeline.replace('-', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Status</p>
                  <p className="mt-0.5 font-medium capitalize text-neutral-800">{lead.status}</p>
                </div>
              </div>
              {lead.patient_location === "out-of-town" && (
                <div className="mt-3 rounded-lg bg-[#F5FAFE] px-3 py-2 text-sm text-neutral-700">
                  📍 <span className="font-medium">Out of town</span>
                  {lead.travel_origin_city && <span className="text-neutral-600"> from {lead.travel_origin_city}</span>}
                  {lead.needs_travel_logistics === 1 && <div className="mt-1 text-xs text-neutral-600">Needs travel arrangements</div>}
                </div>
              )}
              {lead.notes && (
                <p className="mt-4 border-t border-[#F0EDE8] pt-3 text-sm text-neutral-600">
                  {lead.notes}
                </p>
              )}
              {lead.ai_summary && (
                <div className="mt-4 border-t border-[#F0EDE8] pt-3">
                  <p className="text-xs text-neutral-400">AI Summary</p>
                  <p className="mt-1 text-sm text-neutral-700">{lead.ai_summary}</p>
                </div>
              )}
            </div>

            {appointment ? (
              <div className="rounded-xl border border-[#C0DD97] bg-[#EAF3DE] p-6 text-center">
                <div className="text-3xl">✅</div>
                <p className="mt-2 text-base font-bold text-[#3B6D11]">Appointment confirmed</p>
                <p className="mt-1 text-sm text-[#5A9A30]">
                  {appointment.slot_date} at {appointment.slot_time}
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="mt-4 rounded-lg bg-[#0B1120] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#171f33]"
                >
                  Back to dashboard
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-neutral-800">Schedule your consultation</h2>
                <CalendarPicker
                  onSelect={setSelectedSlot}
                  selected={selectedSlot}
                  consultationType={consultationType}
                  onConsultationTypeChange={setConsultationType}
                />

                {bookingError && (
                  <div className="mt-4 rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-2.5 text-sm text-[#A32D2D]">
                    {bookingError}
                  </div>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={!selectedSlot || !consultationType || booking}
                  className="mt-4 w-full rounded-lg bg-[#0B1120] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#171f33] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {booking ? "Booking..." : "Confirm appointment"}
                </button>
              </div>
            )}

            <div>
              <h2 className="mb-3 text-sm font-semibold text-neutral-800">Message history</h2>
              <SMSThread leadId={lead.id} leadName={lead.name} leadPhone={lead.phone} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
