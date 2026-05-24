/**
 * Prowider Lead Allocation Engine
 *
 * Rules:
 *  Service 1 → mandatory: [P1],       pool: [P2, P3, P4]
 *  Service 2 → mandatory: [P5],       pool: [P6, P7, P8]
 *  Service 3 → mandatory: [P1, P4],   pool: [P2, P3, P5, P6, P7, P8]
 *
 * Each lead = exactly 3 unique providers.
 * Pool selection uses persistent round-robin.
 * Quota updates are atomic.
 */

import mongoose from "mongoose";
import { Provider } from "./models/Provider";
import { AllocationState } from "./models/AllocationState";
import type { ServiceType } from "./models/Provider";

export const SERVICE_RULES: Record<
  ServiceType,
  { mandatory: number[]; pool: number[] }
> = {
  "Service 1": { mandatory: [1], pool: [2, 3, 4] },
  "Service 2": { mandatory: [5], pool: [6, 7, 8] },
  "Service 3": { mandatory: [1, 4], pool: [2, 3, 5, 6, 7, 8] },
};

export class AllocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AllocationError";
  }
}

/**
 * Atomically increment quota if available
 */
async function atomicQuotaIncrement(
  providerNumber: number,
  session: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId | null> {
  const updated = await Provider.findOneAndUpdate(
    {
      providerNumber,
      isActive: true,
      $expr: {
        $lt: ["$usedQuota", "$monthlyQuota"],
      },
    },
    {
      $inc: {
        usedQuota: 1,
      },
    },
    {
      new: true,
      session,
    }
  );

  return updated ? updated._id : null;
}

/**
 * Get next provider using safer round-robin allocation
 */
async function pickPoolProvider(
  serviceType: ServiceType,
  exclude: number[],
  session: mongoose.ClientSession
): Promise<{
  providerNumber: number;
  providerId: mongoose.Types.ObjectId;
} | null> {
  const rules = SERVICE_RULES[serviceType];

  const state = await AllocationState.findOne({
    serviceType,
  }).session(session);

  if (!state) {
    throw new AllocationError(
      `AllocationState missing for ${serviceType}`
    );
  }

  const pool = rules.pool.filter(
    (p) => !exclude.includes(p)
  );

  if (pool.length === 0) {
    return null;
  }

  // Snapshot current index
  const startIndex = state.currentIndex % pool.length;

  // Try each provider once
  for (let offset = 0; offset < pool.length; offset++) {
    const idx = (startIndex + offset) % pool.length;

    const candidateNumber = pool[idx];

    try {
      const providerId = await atomicQuotaIncrement(
        candidateNumber,
        session
      );

      if (!providerId) {
        continue;
      }

      // Update allocation state safely
      await AllocationState.updateOne(
        {
          _id: state._id,
        },
        {
          $set: {
            currentIndex: (idx + 1) % rules.pool.length,
          },
          $inc: {
            totalAllocations: 1,
          },
        },
        {
          session,
        }
      );

      return {
        providerNumber: candidateNumber,
        providerId,
      };
    } catch (err: any) {
      console.error(
        `[Pool Provider Error] P${candidateNumber}`,
        err?.message
      );

      continue;
    }
  }

  return null;
}

/**
 * Main allocation logic
 */
export async function allocateProviders(
  serviceType: ServiceType,
  session: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId[]> {
  const rules = SERVICE_RULES[serviceType];

  const assignedIds: mongoose.Types.ObjectId[] = [];

  const assignedNumbers: number[] = [];

  // Mandatory providers first
  for (const providerNumber of rules.mandatory) {
    const providerId = await atomicQuotaIncrement(
      providerNumber,
      session
    );

    if (!providerId) {
      throw new AllocationError(
        `Mandatory provider P${providerNumber} quota exhausted`
      );
    }

    assignedIds.push(providerId);

    assignedNumbers.push(providerNumber);
  }

  // Fill remaining slots
  while (assignedIds.length < 3) {
    const result = await pickPoolProvider(
      serviceType,
      assignedNumbers,
      session
    );

    if (!result) {
      throw new AllocationError(
        `Insufficient providers available for ${serviceType}`
      );
    }

    // Prevent duplicate provider assignment
    if (
      assignedNumbers.includes(result.providerNumber)
    ) {
      continue;
    }

    assignedIds.push(result.providerId);

    assignedNumbers.push(result.providerNumber);
  }

  // Final validation
  const uniqueProviders = new Set(assignedNumbers);

  if (uniqueProviders.size !== 3) {
    throw new AllocationError(
      "Duplicate provider assignment detected"
    );
  }

  return assignedIds;
}