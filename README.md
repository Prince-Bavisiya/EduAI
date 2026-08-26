# EduAI — Enterprise Multi-Tenant School Management SaaS

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-blue.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-indigo.svg)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📖 Overview

**EduAI** is a production-grade, multi-tenant Software-as-a-Service (SaaS) platform built for institutional school and academic operations. It solves the critical operational challenges of modern educational institutions: managing multi-role workflows across administrators, educators, and students while maintaining **strict, cryptographically enforced tenant isolation** and **zero-trust resource authorization**.

### Core Value Propositions:
- **True Multi-Tenancy**: Isolated school environments where tenant boundaries are strictly enforced at the database and middleware layers via Node.js `AsyncLocalStorage` and Prisma query extensions.
- **Hierarchical Role-Based Access Control (RBAC)**: Distinct access scopes and dedicated single-page portals for **SUPER_ADMIN (School Owner)**, **ADMIN**, **TEACHER**, and **STUDENT**.
- **Zero-Trust Resource Ownership (IDOR Prevention)**: Self-service `/api/me/*` endpoints derive all identity, role, and tenant scopes directly from cryptographically verified JWT tokens and database relationships, ignoring client-injected query or body overrides.
- **End-to-End Academic Life Cycle**: Comprehensive modules covering student onboarding, timetable generation, daily subject attendance, continuous assignments, exam grading with GPA calculation, fee billing, and real-time analytics.

---

## ✨ Key Features

### 👑 1. School Owner / SUPER_ADMIN (`/super-admin`)
- **Institution Overview**: Real-time multi-tenant dashboard visualizing system-wide student enrollments, faculty size, course distribution, and system health.
- **Global Settings Management**: Configure institution name, maintenance modes, allowed domains, and institutional policies.
- **Tenant Management**: Control school profile settings, working days, and default attendance thresholds.

### 🛡️ 2. School Administrator (`/admin`)
- **Academic Hierarchy**: Manage departments, courses/classes, sections, subject catalogs, and faculty course assignments.
- **Student & Faculty Management**: Full CRUD lifecycle for students and teachers with paginated search, filter, and detail views.
- **Timetable Scheduling**: Conflict-free weekly timetable management across rooms, teachers, subjects, and class sections.
- **Institution Operations**: Batch attendance tracking, exam scheduling, marks recording, and student fee invoice generation.

### 👨‍🏫 3. Faculty / Teacher Portal (`/teacher`)
- **Daily Schedule & Active Class**: Real-time badge highlighting currently active lecture slots and day-wise schedule view.
- **One-Click Attendance**: Subject-wise student attendance marking with live percentage calculation.
- **Continuous Assessments**: Create assignments, download/review submissions, and provide marks with qualitative feedback.
- **Exam Grading Matrix**: Interactive exam mark entry with dirty-state change detection and confirmation modals.

### 👨‍🎓 4. Student Self-Service Portal (`/student`)
- **Academic Dashboard**: Live attendance percentage, cumulative GPA indicator, pending assignments, and upcoming exam counters.
- **Interactive Timetable**: Dynamic daily class schedule with room allocations and instructor names.
- **Assignment Submissions**: View assigned coursework, submit solutions, and review teacher grading and feedback.
- **Fee Invoicing & Payment History**: Breakdown of tuition, exam fees, outstanding balance, and recorded transactions.
- **AI Performance Insights**: AI-driven study recommendations and conversational academic query assistant.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Browser / Next.js SPA Client"]
    
    subgraph Edge & API Routing
        API["Express REST API Layer (PORT 5000)"]
        JWTAuth["JWT Authentication Middleware\n(Token Verification & Claims Extraction)"]
        TenantCtx["AsyncLocalStorage Context Middleware\n(Binds schoolId to Execution Async Context)"]
        RBAC["Role-Based Access Control Guard\n(SUPER_ADMIN | ADMIN | TEACHER | STUDENT)"]
    end

    subgraph Business Logic & Controllers
        Controllers["Module Controllers\n(Auth, Academics, Attendance, Exams, Fees, /me)"]
        Validators["Input Validation Layer\n(Email, Passwords, Numeric Bounds, Foreign Keys)"]
    end

    subgraph Tenant-Isolated Data Layer
        PrismaExt["Prisma Client Extension / Middleware\n- Auto-injects { schoolId } on queries\n- Translates unique lookups to findFirst(where: { id, schoolId })\n- Restricts updateMany & deleteMany to active schoolId\n- Rejects cross-tenant foreign key mutations"]
        DB[(PostgreSQL Database)]
    end

    Client -->|"HTTP Requests + Bearer JWT"| API
    API --> JWTAuth
    JWTAuth --> TenantCtx
    TenantCtx --> RBAC
    RBAC --> Validators
    Validators --> Controllers
    Controllers --> PrismaExt
    PrismaExt --> DB
```

---

## 🧰 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16.3 (Turbopack) | Modern React 19 App Router architecture |
| **Styling & Design** | Tailwind CSS 4.0 | Responsive, dark-mode first aesthetic |
| **Backend Runtime** | Node.js (v18+) & Express 5.2 | High-throughput REST API server |
| **Database & ORM** | PostgreSQL & Prisma ORM 7.9 | Relational database with client query extensions |
| **Security & Auth** | JSON Web Tokens & bcryptjs | Stateless JWT with salted password hashing |
| **Tenant Isolation** | Node `AsyncLocalStorage` | Thread-safe per-request tenant scoping |
| **Testing** | Node.js Native HTTP Runner | Deterministic API integration and security suites |

---

## 👥 Role Architecture & Route Matrix

| Role | Portal Path | Permitted API Scopes | Unauthorized Scopes |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `/super-admin` | Full school administration, system settings, school owner data | Cross-tenant access |
| **ADMIN** | `/admin` | Institution setup, user onboarding, classes, timetable, fees, reports | Other schools' records |
| **TEACHER** | `/teacher` | Assigned subjects, assigned classes, student attendance, exams, grading | Administrative finance/settings |
| **STUDENT** | `/student` | Self-profile (`/api/me/*`), own marks, own attendance, own fees | Other students' data, admin APIs |

---

## 🔒 Multi-Tenant Security & Isolation Model

Tenant isolation in EduAI is designed on a **defense-in-depth model**:

1. **Token Scoping**: On user login, the backend issues a signed JWT containing the user's verified `userId`, `role`, and `schoolId`.
2. **Context Binding**: The authentication middleware sets the verified `schoolId` into Node.js `AsyncLocalStorage`.
3. **Prisma Query Isolation**:
   - `findMany`, `findFirst`, `count`, `aggregate` automatically inject `{ schoolId: context.schoolId }`.
   - Single-record lookups (`findUnique`, `update`, `delete`) with unique criteria are intercepted and validated against the tenant's `schoolId`.
   - Bulk mutations (`updateMany`, `deleteMany`) are locked strictly to the tenant's `schoolId`.
   - Queries executed outside an active tenant context fail closed with a `403 Forbidden` error.
4. **IDOR & Parameter Tampering Immunity**:
   - Self-service endpoints (`/api/me/dashboard`, `/api/me/fees`, `/api/me`) derive identity exclusively from the JWT session.
   - Client-injected query parameters (e.g. `?studentId=99`) or malicious headers (e.g. `X-Student-Id: 99`) are strictly ignored.

---

## 📊 Database Schema Overview

```mermaid
erDiagram
    School ||--o{ User : "has many"
    School ||--o{ Department : "has many"
    School ||--o{ Course : "has many"
    School ||--o{ Subject : "has many"
    School ||--o{ Fee : "has many"
    
    User ||--o| Admin : "profile"
    User ||--o| Teacher : "profile"
    User ||--o| Student : "profile"
    User ||--o| Parent : "profile"

    Department ||--o{ Course : "offers"
    Course ||--o{ Subject : "contains"
    Course ||--o{ Student : "enrolls"
    Teacher ||--o{ Subject : "teaches"
    
    Student ||--o{ Attendance : "records"
    Student ||--o{ Mark : "achieves"
    Student ||--o{ AssignmentSubmission : "submits"
    Student ||--o{ Fee : "invoiced"
    
    Exam ||--o{ Mark : "contains"
    Assignment ||--o{ AssignmentSubmission : "receives"
    Fee ||--o{ Payment : "has"
```

---

## 🧪 Testing & Quality Assurance

EduAI includes automated HTTP-based integration and security regression suites:

```bash
# Run all backend test suites
cd backend
npm test

# Run individual verification suites
npm run test:tenant       # Verifies Prisma fail-closed tenant scoping
npm run test:security     # Verifies RBAC, IDOR defense, and /api/me isolation
npm run test:integration  # Verifies full 22-step multi-tenant API lifecycle
```

### Verified Test Matrix:
- ✅ **Tenant Isolation Test** (`tenantSecurity.js`): Verifies cross-tenant data leaks and updates are blocked.
- ✅ **Portal Security Test** (`portalRoleSecurity.js`): Verifies role boundary enforcement and IDOR immunity.
- ✅ **Full API Integration Test** (`apiIntegration.js`): Validates atomic onboarding, CRUD lifecycle, and rollbacks.
- ✅ **Frontend TypeScript Compilation**: `npx tsc --noEmit` (**0 errors**).
- ✅ **Production Build Verification**: `npm run build` (**20/20 routes pre-rendered and verified**).

---

## 🚀 Installation & Local Setup

### Prerequisites
- Node.js (v18.x or higher)
- PostgreSQL (v14.x or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/EduAI.git
cd EduAI
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure PostgreSQL connection in .env:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/eduai"

# Run Prisma migrations
npx prisma migrate dev --name init

# Seed default institutional demo data
node prisma/seed.js

# Start backend server
npm run dev
```
Backend will start on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start Next.js development server
npm run dev
```
Frontend will be accessible at `http://localhost:3000`.

---

## 🐳 Docker Containerized Setup

EduAI provides full multi-container orchestration via Docker Compose for reproducible, production-like local development and deployment.

### 1. Configure Environment
```bash
cp .env.example .env
```

### 2. Launch Services with Docker Compose
```bash
# Build and start PostgreSQL, Backend API, and Next.js Frontend
docker compose up -d --build
```

### 3. Initialize & Seed Database inside Container
```bash
# Run Prisma migrations and seed default institutional data
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js
```

### 4. Access Running Services
- **Next.js Web Client**: [http://localhost:3000](http://localhost:3000)
- **Express REST API**: [http://localhost:5000](http://localhost:5000)
- **PostgreSQL Database**: `localhost:5432` (`eduai`)

### 5. Stop Containers
```bash
docker compose down
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

EduAI features an automated continuous integration pipeline (`.github/workflows/ci.yml`) executed on every `push` and `pull_request` against `main` and `master`:

```mermaid
flowchart LR
    A["Git Push / PR"] --> B["Backend CI Job"]
    A --> C["Frontend CI Job"]
    A --> D["Docker CI Job"]

    subgraph Backend Pipeline
        B --> B1["npm ci"]
        B1 --> B2["prisma validate"]
        B2 --> B3["Postgres Service Container"]
        B3 --> B4["prisma migrate deploy"]
        B4 --> B5["node prisma/seed.js"]
        B5 --> B6["npm test (Tenant + Security + Integration)"]
    end

    subgraph Frontend Pipeline
        C --> C1["npm ci"]
        C1 --> C2["tsc --noEmit (Type Check)"]
        C2 --> C3["npm run lint (ESLint)"]
        C3 --> C4["npm run build (Production Build)"]
    end

    subgraph Docker Pipeline
        D --> D1["docker compose config"]
        D1 --> D2["docker compose build"]
    end
```


---

## 🔑 Default Demo Accounts

| Role | Email | Password | Target Portal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@example.com` | `SuperPassword123` | `/super-admin` |
| **Administrator** | `admin@example.com` | `Admin123` | `/admin` |
| **Teacher** | `teacher@example.com` | `Password123` | `/teacher` |
| **Student** | `rahul@example.com` | `Rahul123` | `/student` |

---

## 📂 Project Structure

```
EduAI/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database models & relationships
│   │   ├── seed.js             # Institutional seed script
│   │   └── migrations/         # Prisma migration history
│   ├── src/
│   │   ├── config/             # Prisma client & AsyncLocalStorage setup
│   │   ├── controllers/        # REST API controllers
│   │   ├── middleware/         # Auth, RBAC, tenant context, error handling
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # Business logic & db operations
│   │   ├── tests/              # Tenant, portal security & API integration tests
│   │   └── utils/              # Helper utilities
│   ├── .env.example            # Backend env template
│   ├── package.json
│   └── server.js               # Express application entrypoint
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── admin/          # Admin portal views
│   │   │   ├── super-admin/    # Super Admin management views
│   │   │   ├── teacher/        # Teacher portal views
│   │   │   └── student/        # Student portal views
│   │   ├── components/         # Reusable UI components (BackButton, etc.)
│   │   ├── context/            # AuthContext session management
│   │   └── services/           # Frontend API client & service wrappers
│   ├── .env.example            # Frontend env template
│   ├── next.config.ts
│   └── package.json
│
├── docs/                       # Architectural & API documentation
│   ├── ARCHITECTURE.md         # Detailed architectural specification
│   ├── API.md                  # Comprehensive API reference
│   └── TESTING.md              # QA & testing guide
│
├── .gitignore
├── .env.example
└── README.md
```

---

## 📋 Limitations & Realistic Future Roadmap

### Current Known Boundaries:
- Mocked AI assistant responses (rule-based deterministic evaluation) ready for OpenAI/Gemini API integration.
- Single payment gateway placeholder; transaction records are stored internally without live Stripe/Razorpay webhooks.

### Recommended Next Phase:
- Containerization with Docker & Docker Compose.
- CI/CD pipeline automation with GitHub Actions.
- Production deployment on cloud infrastructure (AWS/GCP/Vercel).
- Rate limiting and Redis-backed session caching.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
