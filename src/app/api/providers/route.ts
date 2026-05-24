import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Provider } from "@/lib/models/Provider";
import { Lead } from "@/lib/models/Lead";
import { ok, err } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();

    const providers = await Provider.find({}).sort({ providerNumber: 1 }).lean();

    // For each provider, get leads assigned
    const enriched = await Promise.all(
      providers.map(async (p) => {
        const leads = await Lead.find({ assignedProviders: p._id })
          .select("name phone city serviceType status createdAt")
          .sort({ createdAt: -1 })
          .lean();
        return {
          ...p,
          remainingQuota: Math.max(0, p.monthlyQuota - p.usedQuota),
          assignedLeads: leads,
          assignedLeadsCount: leads.length,
        };
      })
    );

    return ok(enriched);
  } catch (e) {
    console.error("[Providers GET]", e);
    return err("Failed to fetch providers", 500);
  }
}
