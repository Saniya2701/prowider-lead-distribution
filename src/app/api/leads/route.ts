import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Lead } from "@/lib/models/Lead";
import { Provider } from "@/lib/models/Provider";
import { allocateProviders, AllocationError } from "@/lib/allocator";
import { ok, err } from "@/lib/response";
import { z } from "zod";

const CreateLeadSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  city: z.string().min(1).max(100),
  serviceType: z.enum(["Service 1", "Service 2", "Service 3"]),
  description: z.string().min(1).max(1000),
});

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      Number(searchParams.get("page") ?? 1)
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number(searchParams.get("limit") ?? 20)
      )
    );

    const service = searchParams.get("service");

    const query = service
      ? { serviceType: service }
      : {};

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate(
          "assignedProviders",
          "name providerNumber usedQuota monthlyQuota"
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      Lead.countDocuments(query),
    ]);

    return ok({
      leads,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.error("[Leads GET Error]", e);

    return err("Failed to fetch leads", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed =
      CreateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return err(
        "Validation failed",
        400,
        parsed.error.flatten()
      );
    }

    await connectDB();

    // Duplicate protection
    const existing = await Lead.findOne({
      phone: parsed.data.phone,
      serviceType: parsed.data.serviceType,
    });

    if (existing) {
      return err(
        `A lead with phone ${parsed.data.phone} for ${parsed.data.serviceType} already exists.`,
        409
      );
    }

    let savedLead: any = null;

    // Retry transaction
    for (let attempt = 1; attempt <= 5; attempt++) {
      const session =
        await mongoose.startSession();

      try {
        session.startTransaction();

        console.log(
          `[Attempt ${attempt}] Allocating providers`
        );

        const assignedProviderIds =
          await allocateProviders(
            parsed.data.serviceType,
            session
          );

        const lead = new Lead({
          ...parsed.data,
          assignedProviders:
            assignedProviderIds,
          status: "assigned",
        });

        await lead.save({ session });

        await session.commitTransaction();

        console.log(
          `[Attempt ${attempt}] Success`
        );

        savedLead = lead;

        break;
      } catch (txErr: any) {
        console.error(
          `[Attempt ${attempt}] Transaction Error`,
          txErr?.message || txErr
        );

        try {
          await session.abortTransaction();
        } catch {}

        const isRetryable =
          txErr?.message?.includes(
            "Write conflict"
          ) ||
          txErr?.errorLabels?.includes(
            "TransientTransactionError"
          ) ||
          txErr?.errorLabels?.includes(
            "UnknownTransactionCommitResult"
          );

        if (attempt < 5 && isRetryable) {
          const delay = attempt * 500;

          console.log(
            `Retrying transaction after ${delay}ms...`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, delay)
          );

          continue;
        }

        if (
          txErr instanceof AllocationError
        ) {
          return err(txErr.message, 422);
        }

        throw txErr;
      } finally {
        await session.endSession();
      }
    }

    if (!savedLead) {
      return err(
        "Failed to create lead after retries",
        500
      );
    }

    // Populate lead
    const populated = await Lead.findById(
      savedLead._id
    )
      .populate(
        "assignedProviders",
        "name providerNumber usedQuota monthlyQuota"
      )
      .lean();

    const providers =
      await Provider.find({}).lean();

    // Realtime emit
    try {
      const { emitToRoom } = await import(
        "@/lib/socket"
      );

      emitToRoom(
        "dashboard",
        "lead:new",
        populated
      );

      emitToRoom(
        "dashboard",
        "providers:updated",
        providers
      );
    } catch (socketErr) {
      console.error(
        "[Socket Emit Error]",
        socketErr
      );
    }

    return ok(
      {
        lead: populated,
      },
      201
    );
  } catch (e: any) {
    console.error(
      "[Leads POST Fatal Error]",
      e
    );

    if (
      e instanceof
      mongoose.Error.ValidationError
    ) {
      return err(
        "Validation error",
        400
      );
    }

    // Mongo duplicate key
    if (e?.code === 11000) {
      return err(
        "A lead with this phone and service already exists.",
        409
      );
    }

    return err(
      e?.message ||
        "Internal server error",
      500
    );
  }
}