"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface Lead {
  _id: string;
  name: string;
  phone: string;
  city: string;
  serviceType: string;
  status: string;
  createdAt: string;
}

interface Provider {
  _id: string;
  name: string;
  providerNumber: number;
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  isMandatory: boolean;
  mandatoryFor: string[];
  poolFor: string[];
  assignedLeads: Lead[];
  assignedLeadsCount: number;
}

const SERVICE_COLORS: Record<string, string> = {
  "Service 1": "badge-service1",
  "Service 2": "badge-service2",
  "Service 3": "badge-service3",
};

function QuotaBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-sky-500";
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ProviderCard({ provider }: { provider: Provider }) {
  const [expanded, setExpanded] = useState(false);
  const remaining = provider.monthlyQuota - provider.usedQuota;

  return (
    <div className="card p-5 space-y-4 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-sky-400 font-bold text-sm border border-slate-700">
            P{provider.providerNumber}
          </div>
          <div>
            <div className="font-semibold text-white text-sm">{provider.name}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {provider.isMandatory && (
                <span className="text-xs px-1.5 py-0.5 rounded badge-mandatory border">
                  Mandatory
                </span>
              )}
              {provider.mandatoryFor.map((s) => (
                <span key={s} className={`text-xs px-1.5 py-0.5 rounded border ${SERVICE_COLORS[s]}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-white">{remaining}</div>
          <div className="text-xs text-slate-500">remaining</div>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{provider.usedQuota} used</span>
          <span>{provider.monthlyQuota} total</span>
        </div>
        <QuotaBar used={provider.usedQuota} total={provider.monthlyQuota} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          <span className="text-white font-semibold">{provider.assignedLeadsCount}</span> leads assigned
        </span>
        {provider.assignedLeadsCount > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
          >
            {expanded ? "Hide" : "View"} leads
          </button>
        )}
      </div>

      {expanded && provider.assignedLeads.length > 0 && (
        <div className="space-y-1.5 animate-fade-in">
          {provider.assignedLeads.slice(0, 10).map((lead) => (
            <div key={lead._id} className="bg-slate-800/50 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-white font-medium">{lead.name}</span>
                <span className="text-slate-500 ml-2">{lead.city}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded border ${SERVICE_COLORS[lead.serviceType]}`}>
                {lead.serviceType}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [pRes, lRes] = await Promise.all([
        fetch("/api/providers"),
        fetch("/api/leads?limit=20"),
      ]);
      const [pJson, lJson] = await Promise.all([pRes.json(), lRes.json()]);
      if (pJson.success) setProviders(pJson.data);
      if (lJson.success) setLeads(lJson.data.leads);
      setLastUpdate(new Date());
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.io connection
  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const socket: Socket = io(appUrl, {
      path: "/api/socket",
      transports: ["polling", "websocket"],
    });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:dashboard");
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("lead:new", (newLead: Lead) => {
      setLeads((prev) => [newLead, ...prev.slice(0, 19)]);
      setLastUpdate(new Date());
    });

    socket.on("providers:updated", (updatedProviders: Provider[]) => {
      setProviders(updatedProviders);
      setLastUpdate(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const totalLeads = leads.length;
  const avgUsed = providers.length > 0
    ? Math.round(providers.reduce((s, p) => s + p.usedQuota, 0) / providers.length)
    : 0;
  const totalRemaining = providers.reduce((s, p) => s + Math.max(0, p.monthlyQuota - p.usedQuota), 0);

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex items-center gap-3 text-sm">
        <div className={`flex items-center gap-1.5 ${connected ? "text-emerald-400" : "text-slate-500"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
          {connected ? "Live" : "Connecting..."}
        </div>
        {lastUpdate && (
          <span className="text-slate-600 text-xs">
            Updated {lastUpdate.toLocaleTimeString()}
          </span>
        )}
        <button onClick={fetchData} className="ml-auto text-xs text-sky-400 hover:text-sky-300 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Providers", value: providers.length, color: "text-sky-400" },
          { label: "Total Leads", value: totalLeads, color: "text-violet-400" },
          { label: "Avg Quota Used", value: avgUsed, color: "text-amber-400" },
          { label: "Total Quota Left", value: totalRemaining, color: "text-emerald-400" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`text-3xl font-bold ${s.color}`}>{loading ? "—" : s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Providers grid */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Providers</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3">
                <div className="skeleton h-4 rounded w-3/4" />
                <div className="skeleton h-3 rounded w-1/2" />
                <div className="skeleton h-2 rounded w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {providers.map((p) => (
              <ProviderCard key={p._id} provider={p} />
            ))}
          </div>
        )}
      </div>

      {/* Recent leads */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Leads</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="skeleton h-4 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">No leads yet. Submit one via Request Service.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-slate-500 font-medium">Name</th>
                  <th className="text-left p-4 text-slate-500 font-medium hidden sm:table-cell">Phone</th>
                  <th className="text-left p-4 text-slate-500 font-medium hidden md:table-cell">City</th>
                  <th className="text-left p-4 text-slate-500 font-medium">Service</th>
                  <th className="text-left p-4 text-slate-500 font-medium hidden lg:table-cell">Status</th>
                  <th className="text-left p-4 text-slate-500 font-medium hidden xl:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead._id} className={`border-b border-slate-800/50 animate-fade-in ${i === 0 ? "bg-sky-500/5" : ""}`}>
                    <td className="p-4 text-white font-medium">{lead.name}</td>
                    <td className="p-4 text-slate-400 hidden sm:table-cell">{lead.phone}</td>
                    <td className="p-4 text-slate-400 hidden md:table-cell">{lead.city}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded border ${SERVICE_COLORS[lead.serviceType]}`}>
                        {lead.serviceType}
                      </span>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-1 rounded border ${
                        lead.status === "assigned"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-700 text-slate-400 border-slate-600"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs hidden xl:table-cell">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
