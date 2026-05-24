import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Lead } from "@/lib/models/Lead";
import { Provider } from "@/lib/models/Provider";
import { WebhookEvent } from "@/lib/models/WebhookEvent";
import { allocateProviders, AllocationError } from "@/lib/allocator";
import { ok, err } from "@/lib/response";
import { z } from "zod";

const WebhookSchema = z.object({
  eventId: z.string().uuid("eventId must be a valid UUID"),
  eventType: z.enum(["lead.create"]),
  payload: z.object({
    name: z.string().min(1),
    phone: z.string().regex(/^\d{10}$/),
    city: z.string().min(1),
    serviceType: z.enum(["Service 1", "Service 2", "Service 3"]),
    description: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = WebhookSchema.safeParse(body);
    if (!parsed.success) return err("Invalid webhook payload", 400, parsed.error.flatten());

    await connectDB();

    const { eventId, eventType, payload } = parsed.data;

    // ── IDEMPOTENCY CHECK ──────────────────────────────────────────────────────
    // Use findOneAndUpdate with upsert to atomically create or find the event record
    const webhookEvent = await WebhookEvent.findOneAndUpdate(
      { eventId },
      {
        $setOnInsert: {
          eventId,
          eventType,
          payload,
          status: "pending",
        },
      },
      { upsert: true, new: false } // new: false → returns the OLD doc (null if inserted)
    );

    // If the document existed before → it was already processed or is being processed
    if (webhookEvent) {
      if (webhookEvent.status === "processed") {
        return ok(
          { message: "Duplicate event — already processed", result: webhookEvent.result },
          200
        );
      }
      if (webhookEvent.status === "pending") {
        return ok({ message: "Event is currently being processed" }, 202);
      }
    }

    // ── PROCESS NEW EVENT ──────────────────────────────────────────────────────
    const session = await mongoose.startSession();
    let leadResult;

    try {
      session.startTransaction();

      // Duplicate phone+service guard
      const existing = await Lead.findOne({
        phone: payload.phone,
        serviceType: payload.serviceType,
      }).session(session);

      if (existing) {
        await session.abortTransaction();
        await WebhookEvent.findOneAndUpdate(
          { eventId },
          { status: "failed", result: { error: "Duplicate lead" }, processedAt: new Date() }
        );
        return err("Duplicate lead: phone + service already exists", 409);
      }

      const assignedProviderIds = await allocateProviders(payload.serviceType, session);

      const lead = new Lead({
        ...payload,
        assignedProviders: assignedProviderIds,
        webhookEventId: eventId,
        status: "assigned",
      });

      await lead.save({ session });
      await session.commitTransaction();
      leadResult = lead;
    } catch (txErr) {
      await session.abortTransaction();
      await WebhookEvent.findOneAndUpdate(
        { eventId },
        {
          status: "failed",
          result: { error: txErr instanceof Error ? txErr.message : "Unknown error" },
          processedAt: new Date(),
        }
      );
      if (txErr instanceof AllocationError) return err(txErr.message, 422);
      throw txErr;
    } finally {
      session.endSession();
    }

    // Mark webhook event as processed
    const resultSummary = { leadId: leadResult._id.toString(), status: "assigned" };
    await WebhookEvent.findOneAndUpdate(
      { eventId },
      { status: "processed", result: resultSummary, processedAt: new Date() }
    );

    // Emit realtime updates
    const populated = await Lead.findById(leadResult._id)
      .populate("assignedProviders", "name providerNumber usedQuota monthlyQuota")
      .lean();
    const providers = await Provider.find({}).lean();

    try {
      const { emitToRoom } = await import("@/lib/socket");
      emitToRoom("dashboard", "lead:new", populated);
      emitToRoom("dashboard", "providers:updated", providers);
    } catch {
      // Socket unavailable in serverless
    }

    return ok({ message: "Webhook processed", result: resultSummary }, 201);
  } catch (e) {
    console.error("[Webhook POST]", e);
    if ((e as { code?: number }).code === 11000) {
      return err("Duplicate event ID", 409);
    }
    return err("Internal server error", 500);
  }
}
