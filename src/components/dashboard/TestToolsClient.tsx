"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

type LogEntry = { ts: string; msg: string; type: "info" | "success" | "error" | "warn" };

const SERVICES = ["Service 1", "Service 2", "Service 3"] as const;
type ServiceType = (typeof SERVICES)[number];

function Log({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 max-h-60 overflow-y-auto space-y-1 font-mono text-xs">
      {entries.map((e, i) => (
        <div key={i} className={`flex gap-2 ${
          e.type === "success" ? "text-emerald-400" :
          e.type === "error" ? "text-red-400" :
          e.type === "warn" ? "text-amber-400" :
          "text-slate-400"
        }`}>
          <span className="text-slate-600 shrink-0">{e.ts}</span>
          <span>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function TestToolsClient() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const log = (msg: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      ...prev,
      { ts: new Date().toLocaleTimeString(), msg, type },
    ]);
  };

  const clearLogs = () => setLogs([]);

  // ── 1. Reset quota ───────────────────────────────────────────────────────────
  const resetQuota = async () => {
    setLoading("reset");
    log("Resetting all provider quotas to 10...", "info");
    try {
      const res = await fetch("/api/webhook/reset-quota", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        log(`✓ ${json.data.message}`, "success");
        json.data.providers.forEach((p: { name: string; usedQuota: number; monthlyQuota: number }) =>
          log(`  P${p.name}: ${p.usedQuota}/${p.monthlyQuota} used`, "info")
        );
      } else {
        log(`✗ ${json.message}`, "error");
      }
    } catch (e) {
      log(`Network error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  // ── 2. Webhook idempotency test ──────────────────────────────────────────────
  const [webhookService, setWebhookService] = useState<ServiceType>("Service 1");
  const [webhookRepeat, setWebhookRepeat] = useState(3);

  const testWebhookIdempotency = async () => {
    setLoading("webhook");
    const eventId = uuidv4();
    const payload = {
      eventId,
      eventType: "lead.create",
      payload: {
        name: "Webhook Test User",
        phone: String(Math.floor(1000000000 + Math.random() * 9000000000)),
        city: "TestCity",
        serviceType: webhookService,
        description: "Idempotency test via test tools",
      },
    };

    log(`Sending webhook ${webhookRepeat}x with same eventId: ${eventId.slice(0, 8)}...`, "info");

    const results = await Promise.allSettled(
      Array.from({ length: webhookRepeat }, () =>
        fetch("/api/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).then(async (r) => ({ status: r.status, json: await r.json() }))
      )
    );

    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        const { status, json } = r.value;
        const type = status === 201 ? "success" : status === 200 ? "warn" : "error";
        log(`  Request ${i + 1}: HTTP ${status} — ${json.data?.message || json.message}`, type);
      } else {
        log(`  Request ${i + 1}: FAILED — ${r.reason}`, "error");
      }
    });

    const processed = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === 201
    ).length;
    log(`Idempotency result: ${processed}/1 lead created (${webhookRepeat - processed} duplicate-blocked)`, "info");
    setLoading(null);
  };

  // ── 3. Concurrent leads test ─────────────────────────────────────────────────
  const [concurrentService, setConcurrentService] = useState<ServiceType>("Service 1");

  const generateConcurrentLeads = async () => {
    setLoading("concurrent");
    log("Generating 10 leads simultaneously...", "info");

    const generatePhone = () => String(Math.floor(1000000000 + Math.random() * 9000000000));

    const requests = Array.from({ length: 10 }, (_, i) => ({
      name: `Concurrent User ${i + 1}`,
      phone: generatePhone(),
      city: "TestCity",
      serviceType: concurrentService,
      description: `Concurrent test lead #${i + 1}`,
    }));

    const start = Date.now();
    const results = await Promise.allSettled(
      requests.map((body) =>
        fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then(async (r) => ({ status: r.status, json: await r.json(), name: body.name }))
      )
    );
    const elapsed = Date.now() - start;

    let success = 0;
    let failed = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        if (r.value.status === 201) {
          success++;
          const providers = r.value.json.data?.lead?.assignedProviders
            ?.map((p: { providerNumber: number }) => `P${p.providerNumber}`)
            .join(", ");
          log(`  ✓ ${r.value.name} → assigned [${providers}]`, "success");
        } else {
          failed++;
          log(`  ✗ ${r.value.name} → ${r.value.json.message}`, "error");
        }
      } else {
        failed++;
        log(`  ✗ Network error: ${r.reason}`, "error");
      }
    });

    log(`Done in ${elapsed}ms: ${success} created, ${failed} failed`, "info");
    setLoading(null);
  };

  // ── 4. Clear all leads ───────────────────────────────────────────────────────
  const clearAllLeads = async () => {
    if (!confirm("Delete ALL leads and reset all quotas? This cannot be undone.")) return;
    setLoading("clear");
    log("Clearing all leads and resetting quotas...", "warn");
    try {
      const res = await fetch("/api/webhook/reset-quota", { method: "DELETE" });
      const json = await res.json();
      if (res.ok) log(`✓ ${json.data.message}`, "success");
      else log(`✗ ${json.message}`, "error");
    } catch (e) {
      log(`Network error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  // ── 5. View allocation state ─────────────────────────────────────────────────
  const viewAllocationState = async () => {
    setLoading("allocation");
    log("Fetching allocation state...", "info");
    try {
      const res = await fetch("/api/allocation");
      const json = await res.json();
      if (res.ok) {
        json.data.forEach((s: { serviceType: string; poolProviders: number[]; currentIndex: number; totalAllocations: number }) => {
          log(
            `${s.serviceType}: pool=[${s.poolProviders}] idx=${s.currentIndex} total=${s.totalAllocations}`,
            "info"
          );
        });
      } else {
        log(`✗ ${json.message}`, "error");
      }
    } catch (e) {
      log(`Network error: ${e}`, "error");
    } finally {
      setLoading(null);
    }
  };

  const isLoading = (key: string) => loading === key;

  return (
    <div className="space-y-6">
      {/* Tool 1: Reset Quota */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🔄</div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Reset Provider Quotas</h2>
            <p className="text-slate-400 text-sm mt-1">
              Reset all 8 providers back to quota 10. Only processed via webhook endpoint.
            </p>
            <button
              onClick={resetQuota}
              disabled={!!loading}
              className="btn-primary mt-4"
            >
              {isLoading("reset") ? "Resetting..." : "Reset All Quotas to 10"}
            </button>
          </div>
        </div>
      </div>

      {/* Tool 2: Webhook Idempotency */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🔁</div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Webhook Idempotency Test</h2>
            <p className="text-slate-400 text-sm mt-1">
              Send the same webhook event multiple times with the same <code className="text-sky-400">eventId</code>. Only 1 lead should be created.
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <select
                value={webhookService}
                onChange={(e) => setWebhookService(e.target.value as ServiceType)}
                className="input-field w-36"
              >
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select
                value={webhookRepeat}
                onChange={(e) => setWebhookRepeat(Number(e.target.value))}
                className="input-field w-28"
              >
                {[2, 3, 5, 10].map((n) => <option key={n}>{n}x</option>)}
              </select>
              <button
                onClick={testWebhookIdempotency}
                disabled={!!loading}
                className="btn-primary"
              >
                {isLoading("webhook") ? "Testing..." : "Trigger Webhook"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tool 3: Concurrent leads */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">⚡</div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Generate 10 Leads Simultaneously</h2>
            <p className="text-slate-400 text-sm mt-1">
              Fires 10 simultaneous lead creation requests to test concurrency safety and quota overflow prevention.
            </p>
            <div className="flex gap-3 mt-4 flex-wrap">
              <select
                value={concurrentService}
                onChange={(e) => setConcurrentService(e.target.value as ServiceType)}
                className="input-field w-36"
              >
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button
                onClick={generateConcurrentLeads}
                disabled={!!loading}
                className="btn-primary"
              >
                {isLoading("concurrent") ? "Generating..." : "Generate 10 Leads"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tool 4: View allocation state */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📍</div>
          <div className="flex-1">
            <h2 className="font-bold text-white">View Allocation State</h2>
            <p className="text-slate-400 text-sm mt-1">
              Inspect the current round-robin pointer and total allocation counts per service.
            </p>
            <button
              onClick={viewAllocationState}
              disabled={!!loading}
              className="btn-secondary mt-4"
            >
              {isLoading("allocation") ? "Fetching..." : "View Allocation State"}
            </button>
          </div>
        </div>
      </div>

      {/* Tool 5: Clear all data */}
      <div className="card p-6 border-red-500/20">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🗑️</div>
          <div className="flex-1">
            <h2 className="font-bold text-white">Clear All Data</h2>
            <p className="text-slate-400 text-sm mt-1">
              Deletes all leads and resets quotas. <span className="text-red-400">Destructive — use with caution.</span>
            </p>
            <button
              onClick={clearAllLeads}
              disabled={!!loading}
              className="btn-danger mt-4"
            >
              {isLoading("clear") ? "Clearing..." : "Clear All Leads + Reset Quotas"}
            </button>
          </div>
        </div>
      </div>

      {/* Log output */}
      {logs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-400">Output Log</h3>
            <button onClick={clearLogs} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Clear
            </button>
          </div>
          <Log entries={logs} />
        </div>
      )}
    </div>
  );
}
