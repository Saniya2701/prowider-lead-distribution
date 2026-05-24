import mongoose, { Document, Schema } from "mongoose";

export type ServiceType = "Service 1" | "Service 2" | "Service 3";

export interface IProvider extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  providerNumber: number; // 1-8
  services: ServiceType[];
  monthlyQuota: number;
  usedQuota: number;
  remainingQuota: number;
  isMandatory: boolean;
  mandatoryFor: ServiceType[];
  poolFor: ServiceType[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true },
    providerNumber: { type: Number, required: true, unique: true, min: 1, max: 8 },
    services: [{ type: String, enum: ["Service 1", "Service 2", "Service 3"] }],
    monthlyQuota: { type: Number, default: 10 },
    usedQuota: { type: Number, default: 0 },
    isMandatory: { type: Boolean, default: false },
    mandatoryFor: [{ type: String, enum: ["Service 1", "Service 2", "Service 3"] }],
    poolFor: [{ type: String, enum: ["Service 1", "Service 2", "Service 3"] }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ProviderSchema.virtual("remainingQuota").get(function (this: IProvider) {
  return Math.max(0, this.monthlyQuota - this.usedQuota);
});

export const Provider =
  mongoose.models.Provider || mongoose.model<IProvider>("Provider", ProviderSchema);
