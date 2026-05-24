import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const payload = requireAuth(req);
  if (!payload) return err("Unauthorized", 401);
  return ok({ userId: payload.userId, email: payload.email, role: payload.role });
}
