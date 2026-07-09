"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CalendarSlot, ConsultationPreference } from "@/types";

interface CalendarPickerProps {
  onSelect: (slot: CalendarSlot) => void;
  selected?: CalendarSlot | null;
  consultationType?: ConsultationPreference | null;
  onConsultationTypeChange?: (type: ConsultationPreference) => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function CalendarPicker({ onSelect, selected, consultationType, onConsultationTypeChange }: CalendarPickerProps) {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ slots: CalendarSlot[] }>("/api/calendar/slots");
        if (!cancelled) setSlots(data.slots);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load available times.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-3 text-sm text-[#A32D2D]">
        {error}
      </div>
    );
  }

  if (slots.length === 0) {
    return <p className="text-sm text-neutral-500">No appointment slots are available right now.</p>;
  }

  return (
    <div className="space-y-4">
      {onConsultationTypeChange && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConsultationTypeChange("in-person")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              consultationType === "in-person"
                ? "border-[#C4A15A] bg-[#F3EBDB] text-[#A8853F]"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-[#C4A15A]"
            }`}
          >
            In-person
          </button>
          <button
            type="button"
            onClick={() => onConsultationTypeChange("virtual")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              consultationType === "virtual"
                ? "border-[#C4A15A] bg-[#F3EBDB] text-[#A8853F]"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-[#C4A15A]"
            }`}
          >
            Virtual
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {slots.map((slot) => {
        const isSelected = selected?.date === slot.date && selected?.time === slot.time;
        return (
          <button
            key={`${slot.date}-${slot.time}`}
            type="button"
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className={`rounded-lg border px-3 py-3 text-left text-sm transition ${
              !slot.available
                ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-300"
                : isSelected
                ? "border-[#C4A15A] bg-[#F3EBDB] text-[#A8853F] ring-2 ring-[#C4A15A]/30"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-[#C4A15A] hover:bg-[#FBF7EF]"
            }`}
          >
            <div className="font-medium">{formatDate(slot.date)}</div>
            <div className="mt-0.5 text-xs opacity-80">
              {slot.time}
              {!slot.available && " · unavailable"}
            </div>
          </button>
        );
      })}
      </div>
    </div>
  );
}
