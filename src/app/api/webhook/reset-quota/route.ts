import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Provider } from "@/lib/models/Provider";
import { AllocationState } from "@/lib/models/AllocationState";
import { Lead } from "@/lib/models/Lead";
import { ok, err } from "@/lib/response";

// POST /api/webhook/reset-quota
// Resets all providers to full quota. Should only be triggered via webhook in production.
export async function POST(_req: NextRequest) {
  try {
    await connectDB();

    await Provider.updateMany({}, { $set: { usedQuota: 0 } });

    // Reset round-robin pointers
    await AllocationState.updateMany({}, { $set: { currentIndex: 0 } });

    const providers = await Provider.find({}).sort({ providerNumber: 1 }).lean();

    // Emit realtime update
    try {
      const { emitToRoom } = await import("@/lib/socket");
      emitToRoom("dashboard", "providers:updated", providers);
    } catch {
      // ignore
    }

    return ok({ message: "All provider quotas reset to 10", providers });
  } catch (e) {
    console.error("[ResetQuota]", e);
    return err("Failed to reset quotas", 500);
  }
}

// DELETE /api/webhook/reset-quota — clear all leads too (dev/test only)
export async function DELETE(_req: NextRequest) {
  try {
    await connectDB();
    await Lead.deleteMany({});
    await Provider.updateMany({}, { $set: { usedQuota: 0 } });
    await AllocationState.updateMany({}, { $set: { currentIndex: 0, totalAllocations: 0 } });
    return ok({ message: "All leads deleted and quotas reset" });
  } catch (e) {
    console.error("[ResetAll]", e);
    return err("Failed to reset", 500);
  }
}
