# EduAI Testing & Quality Assurance Guide

## 1. Testing Philosophy & Strategy

EduAI employs a deterministic testing strategy that exercises the application under realistic conditions:
- **Real HTTP Network Execution**: Tests make real HTTP network calls against the running Express application.
- **Strict Tenant & Role Scoping**: Every security test seeds isolated test institutions (`School Alpha`, `School Beta`) and proves zero-leakage boundaries.
- **Fail-Closed Boundary Assertion**: The suite validates that missing context or tampered payloads fail securely.

---

## 2. Test Suites Overview

| Suite | File Location | Scope & Assertions |
| :--- | :--- | :--- |
| **Tenant Isolation Suite** | `backend/src/tests/tenantSecurity.js` | Direct Prisma client extension scoping, `findMany`, `findFirst`, `updateMany`, `deleteMany`, and fail-closed missing context. |
| **Portal Role & IDOR Suite** | `backend/src/tests/portalRoleSecurity.js` | RBAC route authorization, `/api/me/*` scoping, client parameter injection rejection, and cross-student IDOR denial. |
| **Full API Integration Suite** | `backend/src/tests/apiIntegration.js` | Complete 22-step lifecycle: Onboarding, transaction rollbacks, CRUD across all entities, grade entry, fees, and error sanitization. |

---

## 3. Running Automated Test Suites

Ensure the backend server is running in development mode:
```bash
# Terminal 1: Start Backend Server
cd backend
npm run dev
```

Run test suites from a second terminal:

### Run All Backend Suites
```bash
cd backend
npm test
```

### Run Individual Test Suites
```bash
# 1. Tenant Isolation Regression Tests
npm run test:tenant

# 2. Role-Based Access & IDOR Security Tests
npm run test:security

# 3. Comprehensive End-to-End API Integration Suite
npm run test:integration
```

---

## 4. Frontend Verification & Build Integrity

### 4.1 TypeScript Compiler Verification
Validates all TypeScript interfaces, component props, and page signatures without emitting code:
```bash
cd frontend
npx tsc --noEmit
```
Expected output: Exits cleanly with code `0` and **0 errors**.

### 4.2 Next.js Production Build Verification
Compiles, tree-shakes, and statically generates all 20 dynamic and static application routes:
```bash
cd frontend
npm run build
```
Expected output:
```
✓ Compiled successfully
✓ Generating static pages (20/20)
✓ Finalizing page optimization
```

---

## 5. Manual Browser & Chrome DevTools QA Methodology

All four role-specific portals have been audited and verified via Chrome DevTools:

### 1. `SUPER_ADMIN` Portal (`/super-admin`)
- Verified live institution KPI metrics.
- Verified system maintenance toggle and allowed domain settings updates.
- Verified school profile and working day configurations.

### 2. `ADMIN` Portal (`/admin`)
- Verified CRUD operations on Departments, Courses, Subjects, Teachers, and Students.
- Verified Back navigation and unsaved changes confirmation dialogs.
- Verified timetable grid and conflict-free slot generation.

### 3. `TEACHER` Portal (`/teacher`)
- Verified dynamic schedule loading and active lecture slot indicator.
- Verified subject-filtered student attendance register.
- Verified exam grading modal with dirty-state change protection.
- Verified assignment submissions review and grading feedback.

### 4. `STUDENT` Portal (`/student`)
- Verified attendance summary and cumulative GPA card.
- Verified timetable view with room and instructor details.
- Verified self-service fee invoice balance and payment breakdown.
- Verified assignment solution submission workflow.
