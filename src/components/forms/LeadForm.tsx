"use client";

import { useState } from "react";

const SERVICES = ["Service 1", "Service 2", "Service 3"] as const;
type ServiceType = (typeof SERVICES)[number];

interface AssignedProvider {
  name: string;
  providerNumber: number;
}

interface LeadResult {
  lead: {
    _id: string;
    name: string;
    phone: string;
    city: string;
    serviceType: string;
    assignedProviders: AssignedProvider[];
  };
}

export function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    serviceType: "Service 1" as ServiceType,
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LeadResult | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.message || "Something went wrong");
        return;
      }
      setResult(json.data);
      setForm({ name: "", phone: "", city: "", serviceType: "Service 1", description: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const serviceColor: Record<ServiceType, string> = {
    "Service 1": "text-sky-400",
    "Service 2": "text-violet-400",
    "Service 3": "text-emerald-400",
  };

  if (result) {
    return (
      <div className="card p-8 animate-fade-in">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="text-2xl font-bold text-white">Lead Submitted!</h2>
          <p className="text-slate-400 mt-1">Your service request has been created.</p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Name</span>
              <span className="text-white font-medium">{result.lead.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone</span>
              <span className="text-white font-medium">{result.lead.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">City</span>
              <span className="text-white font-medium">{result.lead.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Service</span>
              <span className={`font-medium ${serviceColor[result.lead.serviceType as ServiceType]}`}>
                {result.lead.serviceType}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Assigned Providers ({result.lead.assignedProviders.length})
            </h3>
            <div className="space-y-2">
              {result.lead.assignedProviders.map((p) => (
                <div key={p.providerNumber} className="flex items-center gap-3 bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                  <div className="w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-bold text-sm">
                    P{p.providerNumber}
                  </div>
                  <span className="text-slate-200 text-sm font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => setResult(null)}
          className="btn-primary w-full mt-6"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-8 space-y-5 animate-fade-in">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div>
        <label className="label">Full Name *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="John Doe"
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Phone Number * (10 digits)</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          pattern="\d{10}"
          maxLength={10}
          placeholder="9876543210"
          className="input-field"
        />
      </div>

      <div>
        <label className="label">City *</label>
        <input
          name="city"
          value={form.city}
          onChange={handleChange}
          required
          placeholder="Mumbai"
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Service Type *</label>
        <select
          name="serviceType"
          value={form.serviceType}
          onChange={handleChange}
          className="input-field"
        >
          {SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Description *</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Describe your service requirement..."
          className="input-field resize-none"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          "Submit Service Request"
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        The same phone number cannot submit two requests for the same service type.
      </p>
    </form>
  );
}
