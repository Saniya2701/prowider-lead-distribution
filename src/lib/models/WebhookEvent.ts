import mongoose, { Document, Schema } from "mongoose";

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;         // idempotency key (UUID)
  eventType: string;
  payload: Record<string, unknown>;
  status: "pending" | "processed" | "failed";
  processedAt?: Date;
  result?: Record<string, unknown>;
  createdAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
    processedAt: { type: Date },
    result: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// TTL index — clean up after 30 days
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const WebhookEvent =
  mongoose.models.WebhookEvent ||
  mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema);
