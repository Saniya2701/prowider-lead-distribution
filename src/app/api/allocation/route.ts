import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { AllocationState } from "@/lib/models/AllocationState";
import { ok, err } from "@/lib/response";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const states = await AllocationState.find({}).sort({ serviceType: 1 }).lean();
    return ok(states);
  } catch (e) {
    console.error("[AllocationState GET]", e);
    return err("Failed to fetch allocation state", 500);
  }
}
