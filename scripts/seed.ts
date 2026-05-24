#!/usr/bin/env tsx
/**
 * Seed script: initializes 8 providers, allocation state, and admin user.
 * Usage:
 *   npm run seed          → idempotent insert (safe to re-run)
 *   npm run seed:reset    → drops collections first, then seeds
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

async function seed() {
  const reset = process.argv.includes("--reset");

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI!);
  console.log("✓ Connected");

  // Lazy import models after connection
  const { Provider } = await import("../src/lib/models/Provider");
  const { AllocationState } = await import("../src/lib/models/AllocationState");
  const { User } = await import("../src/lib/models/User");

  if (reset) {
    console.log("🗑️  Dropping existing data...");
    await Provider.deleteMany({});
    await AllocationState.deleteMany({});
    await User.deleteMany({ role: "admin" });
    console.log("✓ Collections cleared");
  }

  // ── PROVIDERS ────────────────────────────────────────────────────────────────
  const providerData = [
    {
      providerNumber: 1,
      name: "Provider 1 — Alpha Services",
      isMandatory: true,
      mandatoryFor: ["Service 1", "Service 3"],
      poolFor: [],
      services: ["Service 1", "Service 3"],
    },
    {
      providerNumber: 2,
      name: "Provider 2 — Beta Solutions",
      isMandatory: false,
      mandatoryFor: [],
      poolFor: ["Service 1", "Service 3"],
      services: ["Service 1", "Service 3"],
    },
    {
      providerNumber: 3,
      name: "Provider 3 — Gamma Works",
      isMandatory: false,
      mandatoryFor: [],
      poolFor: ["Service 1", "Service 3"],
      services: ["Service 1", "Service 3"],
    },
    {
      providerNumber: 4,
      name: "Provider 4 — Delta Corp",
      isMandatory: true,
      mandatoryFor: ["Service 3"],
      poolFor: ["Service 1"],
      services: ["Service 1", "Service 3"],
    },
    {
      providerNumber: 5,
      name: "Provider 5 — Epsilon Group",
      isMandatory: true,
      mandatoryFor: ["Service 2"],
      poolFor: ["Service 3"],
      services: ["Service 2", "Service 3"],
    },
    {
      providerNumber: 6,
      name: "Provider 6 — Zeta Partners",
      isMandatory: false,
      mandatoryFor: [],
      poolFor: ["Service 2", "Service 3"],
      services: ["Service 2", "Service 3"],
    },
    {
      providerNumber: 7,
      name: "Provider 7 — Eta Network",
      isMandatory: false,
      mandatoryFor: [],
      poolFor: ["Service 2", "Service 3"],
      services: ["Service 2", "Service 3"],
    },
    {
      providerNumber: 8,
      name: "Provider 8 — Theta Systems",
      isMandatory: false,
      mandatoryFor: [],
      poolFor: ["Service 2", "Service 3"],
      services: ["Service 2", "Service 3"],
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const p of providerData) {
    const exists = await Provider.findOne({ providerNumber: p.providerNumber });
    if (exists) {
      console.log(`  ↳ P${p.providerNumber} already exists — skipping`);
      skipped++;
      continue;
    }
    await Provider.create({
      ...p,
      monthlyQuota: 10,
      usedQuota: 0,
      isActive: true,
    });
    console.log(`  ✓ Created P${p.providerNumber}: ${p.name}`);
    created++;
  }
  console.log(`Providers: ${created} created, ${skipped} skipped\n`);

  // ── ALLOCATION STATE ─────────────────────────────────────────────────────────
  const allocationData = [
    {
      serviceType: "Service 1",
      poolProviders: [2, 3, 4],
      currentIndex: 0,
    },
    {
      serviceType: "Service 2",
      poolProviders: [6, 7, 8],
      currentIndex: 0,
    },
    {
      serviceType: "Service 3",
      poolProviders: [2, 3, 5, 6, 7, 8],
      currentIndex: 0,
    },
  ];

  for (const a of allocationData) {
    const exists = await AllocationState.findOne({ serviceType: a.serviceType });
    if (exists) {
      console.log(`  ↳ AllocationState for ${a.serviceType} already exists — skipping`);
      continue;
    }
    await AllocationState.create(a);
    console.log(`  ✓ AllocationState for ${a.serviceType} (pool: [${a.poolProviders}])`);
  }

  // ── ADMIN USER ───────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@prowider.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    await User.create({ email: adminEmail, password: adminPassword, role: "admin" });
    console.log(`\n  ✓ Admin user created: ${adminEmail}`);
  } else {
    console.log(`\n  ↳ Admin user already exists: ${adminEmail}`);
  }

  console.log("\n✅ Seed complete!");
  console.log(`\n🔑 Login: ${adminEmail} / ${adminPassword}`);
  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
