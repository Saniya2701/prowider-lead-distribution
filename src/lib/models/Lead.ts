import mongoose, { Document, Schema } from "mongoose";
import type { ServiceType } from "./Provider";

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  city: string;
  serviceType: ServiceType;
  description: string;
  assignedProviders: mongoose.Types.ObjectId[];
  webhookEventId?: string;
  status: "pending" | "assigned" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    serviceType: {
      type: String,
      required: true,
      enum: ["Service 1", "Service 2", "Service 3"],
    },
    description: { type: String, required: true, trim: true },
    assignedProviders: [{ type: Schema.Types.ObjectId, ref: "Provider" }],
    webhookEventId: { type: String, sparse: true },
    status: { type: String, enum: ["pending", "assigned", "failed"], default: "pending" },
  },
  { timestamps: true }
);

// Compound unique index: same phone + same service = duplicate
LeadSchema.index({ phone: 1, serviceType: 1 }, { unique: true });

export const Lead = mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
