"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { SMSLog } from "@/types";

interface SMSThreadProps {
  leadId: string;
  leadName?: string;
  leadPhone?: string;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SMSThread({ leadId, leadName, leadPhone }: SMSThreadProps) {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ messages: SMSLog[] }>(`/api/sms/send?lead_id=${encodeURIComponent(leadId)}`);
      setLogs(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await apiFetch<{ sms: SMSLog }>("/api/sms/send", {
        method: "POST",
        body: JSON.stringify({
          lead_id: leadId,
          direction: "outbound",
          body: draft.trim(),
        }),
      });
      setLogs((prev) => [...prev, data.sms]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#EEEBE5] bg-white">
      <div className="flex items-center gap-3 bg-[#1C1710] px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C4A15A] to-[#A8853F] text-base">
          🏠
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{leadName ?? "Lead"}</p>
          <p className="truncate text-xs text-[#9C8E76]">{leadPhone ?? leadId}</p>
        </div>
        <button
          onClick={loadLogs}
          className="ml-auto flex-shrink-0 rounded-md px-2 py-1 text-xs text-[#9C8E76] transition hover:bg-white/10 hover:text-white"
        >
          Refresh
        </button>
      </div>

      <div className="min-h-[260px] max-h-[420px] overflow-y-auto bg-[#FAFAF8] px-4 py-4">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 w-2/3 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-[#F09595] bg-[#FCEBEB] px-4 py-3 text-sm text-[#A32D2D]">
            {error}
          </div>
        )}

        {!loading && !error && logs.length === 0 && (
          <p className="text-center text-sm text-neutral-400">No messages yet.</p>
        )}

        {!loading &&
          !error &&
          logs.map((log) => {
            const isOutbound = log.direction === "outbound";
            return (
              <div
                key={log.id}
                className={`mb-2.5 flex ${isOutbound ? "justify-end" : "justify-start"}`}
              >
                {!isOutbound && (
                  <div className="mr-2 flex h-7 w-7 flex-shrink-0 items-end items-center justify-center self-end rounded-full bg-gradient-to-br from-[#C4A15A] to-[#A8853F] text-xs text-white">
                    🏠
                  </div>
                )}
                <div className="max-w-[75%]">
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isOutbound
                        ? "rounded-br-sm bg-[#1C1710] text-white"
                        : "rounded-bl-sm bg-[#F0EDE8] text-neutral-800"
                    }`}
                  >
                    {log.body}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-neutral-400 ${
                      isOutbound ? "text-right" : "text-left"
                    }`}
                  >
                    {formatTime(log.sent_at)}
                  </p>
                </div>
              </div>
            );
          })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-[#F0EDE8] bg-white px-3 py-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Type a message..."
          className="flex-1 rounded-full border border-neutral-300 px-3.5 py-2 text-sm outline-none focus:border-[#C4A15A] focus:ring-2 focus:ring-[#C4A15A]/20"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="rounded-full bg-[#1C1710] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2A2318] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
