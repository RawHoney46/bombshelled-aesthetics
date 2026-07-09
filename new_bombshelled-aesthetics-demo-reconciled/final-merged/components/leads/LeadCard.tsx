import Link from "next/link";
import ScoreBadge from "./ScoreBadge";
import type { Lead } from "@/types";

interface LeadCardProps {
  lead: Lead;
}

const STATUS_STYLES: Record<"new" | "qualified" | "qualifying" | "booked" | "lost", { bg: string; text: string; dot: string; label: string }> = {
  new: { bg: "bg-[#E6F1FB]", text: "text-[#185FA5]", dot: "bg-[#388BDE]", label: "New" },
  qualifying: { bg: "bg-[#F0F0F0]", text: "text-[#666666]", dot: "bg-[#999999]", label: "Qualifying" },
  qualified: { bg: "bg-[#FAEEDA]", text: "text-[#854F0B]", dot: "bg-[#EF9F27]", label: "Qualified" },
  booked: { bg: "bg-[#EAF3DE]", text: "text-[#3B6D11]", dot: "bg-[#639922]", label: "Booked" },
  lost: { bg: "bg-[#EEEDFE]", text: "text-[#3C3489]", dot: "bg-[#7F77DD]", label: "Lost" },
};

function StatusPill({ status }: { status: "new" | "qualified" | "qualifying" | "booked" | "lost" }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.new;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link
      href={`/book/${lead.id}`}
      className="block rounded-xl border border-[#EEEBE5] bg-white p-4 transition hover:bg-[#FAFAF8]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-neutral-900">{lead.name}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{lead.phone}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <ScoreBadge score={lead.score} size="sm" />
          <StatusPill status={lead.status} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="capitalize">{lead.procedure_category}</span>
        <span className="capitalize">{lead.timeline.replace('-', ' ')}</span>
        {lead.patient_location === "out-of-town" && <span className="font-medium">📍 Out of town</span>}
        <span>{formatCreatedAt(lead.created_at)}</span>
      </div>

      {lead.ai_summary && (
        <p className="mt-2 line-clamp-2 text-xs text-neutral-600">{lead.ai_summary}</p>
      )}
    </Link>
  );
}
