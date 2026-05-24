# Prowider — Mini Lead Distribution System

A production-ready lead distribution system with fair round-robin allocation, real-time dashboard updates via Socket.io, webhook idempotency, and MongoDB transactions for concurrency safety.

---

## Features

| Feature | Implementation |
|---------|---------------|
| Lead creation with duplicate prevention | Compound unique index `(phone, serviceType)` |
| Exactly 3 providers per lead | Mandatory + round-robin pool allocation |
| Fair round-robin allocation | Persistent `AllocationState` collection |
| Quota enforcement | Atomic `findOneAndUpdate` with quota condition |
| Concurrency safety | MongoDB transactions (`startSession`) |
| Real-time dashboard | Socket.io, no polling |
| Webhook idempotency | `WebhookEvent` collection with `upsert + setOnInsert` |
| No in-memory state | All state persisted in MongoDB |

---

## Allocation Rules

```
Service 1 → Mandatory: [P1]       Pool: [P2, P3, P4]
Service 2 → Mandatory: [P5]       Pool: [P6, P7, P8]
Service 3 → Mandatory: [P1, P4]   Pool: [P2, P3, P5, P6, P7, P8]
```

Each lead is assigned **exactly 3 unique providers**.

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd prowider-lead-distribution
npm install
```

### 2. MongoDB Atlas Setup

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) and sign up/log in.
2. Create a new **free (M0)** cluster.
3. In **Database Access** → Add a new user (e.g., `prowider_user` / strong password).
4. In **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere) for development.
5. Click **Connect** → **Connect your application** → Copy the connection string.

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://prowider_user:<password>@cluster0.xxxxx.mongodb.net/prowider?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@prowider.com
ADMIN_PASSWORD=Admin@123
WEBHOOK_SECRET=your-webhook-secret
```

### 4. Seed the Database

```bash
npm run seed
```

This creates:
- 8 providers (P1–P8) with `monthlyQuota: 10`
- Allocation state for each service
- Admin user

To reset and re-seed:
```bash
npm run seed:reset
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with system overview |
| `/request-service` | Customer lead submission form |
| `/dashboard` | Live provider stats + lead list |
| `/test-tools` | Developer testing utilities |
| `/login` | Admin login |

---

## API Reference

### Leads

```
POST /api/leads          — Create a lead (triggers allocation)
GET  /api/leads          — List leads (paginated)
```

### Providers

```
GET /api/providers       — All providers with quota + assigned leads
```

### Webhook

```
POST   /api/webhook                — Idempotent lead creation via webhook
POST   /api/webhook/reset-quota    — Reset all quotas to 10
DELETE /api/webhook/reset-quota    — Delete all leads + reset quotas
```

### Webhook Payload

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "lead.create",
  "payload": {
    "name": "John Doe",
    "phone": "9876543210",
    "city": "Mumbai",
    "serviceType": "Service 1",
    "description": "Need plumbing service"
  }
}
```

**Idempotency**: Sending the same `eventId` multiple times creates only **1 lead**.

### Allocation State

```
GET /api/allocation      — View current round-robin state
```

### Auth

```
POST /api/auth/login     — Login → returns JWT
POST /api/auth/logout    — Logout
GET  /api/auth/me        — Verify token
```

---

## Concurrency Safety

The system handles simultaneous lead creation via:

1. **MongoDB Transactions** — `startSession()` + `startTransaction()` wraps allocation + lead save
2. **Atomic Quota Check** — `findOneAndUpdate` with `$expr: { $lt: ["$usedQuota", "$monthlyQuota"] }` prevents race conditions
3. **Round-Robin State** — AllocationState index advanced atomically per allocation
4. **Duplicate Guard** — Compound unique index `(phone, serviceType)` enforced at DB level

---

## Deployment

### Vercel (Recommended for Frontend)

> Note: Socket.io requires a persistent server. On Vercel, realtime updates fall back gracefully (dashboard still shows data via fetch).

```bash
npm install -g vercel
vercel login
vercel --prod
```

Set environment variables in Vercel dashboard under **Settings → Environment Variables**.

### Railway (Recommended — Full Socket.io Support)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Set environment variables in Railway dashboard.

---

## GitHub Setup

```bash
git init
git add .
git commit -m "feat: initial prowider lead distribution system"
git branch -M main
git remote add origin https://github.com/<username>/prowider-lead-distribution.git
git push -u origin main
```

---

## Test Tools

Navigate to `/test-tools` to:

1. **Reset Quota** — Reset all providers back to 10
2. **Webhook Idempotency Test** — Send same webhook N times, only 1 lead created
3. **10 Concurrent Leads** — Fire 10 simultaneous requests to test concurrency
4. **View Allocation State** — Inspect round-robin pointers
5. **Clear All Data** — Delete all leads + reset quotas (dev only)

---

## Tech Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **MongoDB Atlas + Mongoose**
- **Socket.io** (custom HTTP server)
- **JWT** (authentication)
- **Zod** (validation)

---

## Database Collections

| Collection | Purpose |
|-----------|---------|
| `providers` | 8 providers with quota tracking |
| `leads` | Customer leads with assigned providers |
| `allocationstates` | Round-robin pointer per service |
| `webhookevents` | Idempotency log for webhooks |
| `users` | Admin authentication |

---

## License

MIT
