"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import LeadCard from "@/components/leads/LeadCard";
import type { Lead } from "@/types";

const FILTERS: { value: "all" | "new" | "qualifying" | "qualified" | "booked" | "lost"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "qualifying", label: "Qualifying" },
  { value: "qualified", label: "Qualified" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
];

function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <button
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
        active
          ? "bg-[#378ADD]/15 font-semibold text-[#66AAEE]"
          : "text-[#8899BB] hover:bg-white/5"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "qualifying" | "qualified" | "booked" | "lost">("all");
  const [search, setSearch] = useState("");

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ leads: Lead[] }>("/api/leads");
      setLeads(data.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus = filter === "all" || lead.status === filter;
      const matchesSearch =
        !search.trim() ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [leads, filter, search]);

  const stats = useMemo(() => {
    const total = leads.length;
    const booked = leads.filter((l) => l.status === "booked").length;
    const avgScore = total > 0 ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / total) : 0;
    const hotLeads = leads.filter((l) => l.score >= 70).length;
    return { total, booked, avgScore, hotLeads };
  }, [leads]);

  return (
    <div className="flex min-h-screen bg-[#F7F6F2]">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col bg-[#0B1120]">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#378ADD] to-[#1D9E75] text-base">
              ✨
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">Bombshelled</p>
              <p className="text-[11px] text-[#6B7A99]">Aesthetics · Lead AI</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem icon="⬡" label="Dashboard" active />
          <NavItem icon="◈" label="Capture form" />
          <NavItem icon="◎" label="Settings" />
        </nav>
        <div className="p-3">
          <div className="rounded-lg border border-[#378ADD]/20 bg-[#378ADD]/10 px-3 py-2.5">
            <p className="text-xs font-semibold text-[#66AAEE]">⚡ AI active</p>
            <p className="mt-1 text-[11px] text-[#6B7A99]">
              Auto-responding to new leads
            </p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <div className="flex items-center justify-between border-b border-[#F0EDE8] bg-[#FAFAF8] px-8 py-5">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Speed-to-lead AI · real-time overview</p>
          </div>
          <button
            onClick={loadLeads}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Refresh
          </button>
        </div>

        <div className="px-8 py-6">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
              <p className="text-xs text-neutral-500">Total leads</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
              <p className="text-xs text-neutral-500">Booked appointments</p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{stats.booked}</p>
            </div>
            <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
              <p className="text-xs text-neutral-500">Average lead score</p>
              <p className="mt-1 text-2xl font-bold text-[#3B6D11]">{stats.avgScore}</p>
            </div>
            <div className="rounded-xl border border-[#EEEBE5] bg-white p-5">
              <p className="text-xs text-neutral-500">Hot leads (70+)</p>
              <p className="mt-1 text-2xl font-bold text-[#3B6D11]">{stats.hotLeads}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="flex-1 min-w-[200px] rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm outline-none focus:border-[#378ADD] focus:ring-2 focus:ring-[#378ADD]/20"
            />
            <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    filter === f.value
                      ? "bg-[#0B1120] text-white"
                      : "text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lead list */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-white/60 border border-[#EEEBE5]" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-3 text-sm text-[#A32D2D]">
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-xl border border-[#EEEBE5] bg-white py-12 text-center text-sm text-neutral-400">
              No leads found.
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
