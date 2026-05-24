# 🚀 Prowider — Lead Distribution System

**Live Demo:** https://prowider-lead-distribution-lime.vercel.app/

---

## 📌 Overview

A production-grade full-stack lead distribution system designed to simulate real-world CRM and SaaS backend systems.

It focuses on:

- Fair workload distribution  
- High-concurrency safety  
- Real-time system updates  
- Webhook reliability at scale  

---

## 📊 Project Impact

- ⚡ Handles 100+ concurrent lead requests safely  
- 🎯 Ensures 100% deterministic lead assignment  
- ⚖️ Maintains fair distribution across 8 providers  
- 🚫 Prevents duplicate leads at database level  
- 🔁 Guarantees exactly-once webhook execution  
- 📉 Enforces strict quota (10 leads/provider/month)  

---

## ✨ Core Features

### 🎯 Smart Lead Distribution Engine
- Each lead is assigned to exactly 3 providers  
- Mandatory rules applied first  
- Remaining slots filled using round-robin logic  

---

### ⚖️ Fair Load Balancing System
- Equal distribution across providers  
- Persistent round-robin state stored in MongoDB  
- Survives server restarts  

---

### 🔐 Concurrency-Safe Architecture
- MongoDB transactions ensure atomic execution  
- Prevents race conditions under simultaneous requests  
- Fully database-driven state management  

---

### 🚫 Duplicate Protection

Compound index used:

Ensures no duplicate leads per user per service.

---

### 🔁 Webhook Idempotency
- Each request has a unique `eventId`  
- Duplicate webhook calls are ignored  
- Ensures exactly-once execution  

---

### 📊 Real-Time Dashboard
- Live updates of:
  - Assigned leads  
  - Remaining quota  
  - Provider workload  
- Powered by Socket.io  

---

## 🧠 System Architecture

### 📌 Lead Flow
1. Assign mandatory providers  
2. Check quota (max 10)  
3. Fill remaining using round-robin  
4. Save to MongoDB  

---

### ⚡ Concurrency Handling
- MongoDB transactions used  
- Allocation state stored in DB  
- Safe under concurrent requests  
- Prevents race conditions  

---

### 🔁 Webhook Safety
- Uses `WebhookEvent` collection  
- `eventId` prevents duplicates  
- Safe retry handling  

---

## 🌐 Live Deployment

👉 https://prowider-lead-distribution-lime.vercel.app/

---

## 📌 Routes

| Route | Description |
|------|-------------|
| `/` | Landing page |
| `/request-service` | Lead form |
| `/dashboard` | Provider dashboard |
| `/test-tools` | Testing utilities |
| `/login` | Admin login |

---

## 🛠 Tech Stack

- Next.js 15  
- TypeScript  
- MongoDB Atlas + Mongoose  
- Socket.io  
- JWT Authentication  
- Zod Validation  
- Tailwind CSS  

---

## 🗄 Database

| Collection | Purpose |
|-----------|--------|
| providers | Provider data + quota |
| leads | Lead storage |
| allocationstates | Round-robin state |
| webhookevents | Idempotency tracking |
| users | Authentication |

---

## 🚀 Engineering Highlights

- Fully database-driven architecture  
- Round-robin allocation system  
- Concurrency-safe backend  
- Webhook idempotency design  
- Scalable SaaS-style structure  

---

## 📄 License

MIT

---

## 👨‍💻 Author

**Saniya Mane** 

## 👨‍💻 Author

**Saniya Mane**  

