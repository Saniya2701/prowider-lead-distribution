import mongoose, { Document, Schema } from "mongoose";
import type { ServiceType } from "./Provider";

export interface IAllocationState extends Document {
  _id: mongoose.Types.ObjectId;
  serviceType: ServiceType;
  poolProviders: number[]; // provider numbers in pool
  currentIndex: number;    // current round-robin pointer
  totalAllocations: number;
  updatedAt: Date;
}

const AllocationStateSchema = new Schema<IAllocationState>(
  {
    serviceType: {
      type: String,
      required: true,
      unique: true,
      enum: ["Service 1", "Service 2", "Service 3"],
    },
    poolProviders: [{ type: Number }],
    currentIndex: { type: Number, default: 0 },
    totalAllocations: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const AllocationState =
  mongoose.models.AllocationState ||
  mongoose.model<IAllocationState>("AllocationState", AllocationStateSchema);
