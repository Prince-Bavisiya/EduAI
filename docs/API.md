# EduAI REST API Reference

All requests to protected endpoints require an `Authorization` header with a valid Bearer token:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 1. Authentication (`/api/auth`)

### 1.1 Register School & Super Admin
- **Method**: `POST`
- **Endpoint**: `/api/auth/register`
- **Auth**: None (Public)
- **Role**: Public
- **Request Body**:
```json
{
  "schoolName": "Springfield High",
  "ownerName": "Principal Skinner",
  "email": "owner@springfield.edu",
  "password": "SecurePassword123"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "School registered successfully",
  "data": {
    "user": { "id": 1, "name": "Principal Skinner", "email": "owner@springfield.edu", "role": "SUPER_ADMIN" },
    "school": { "id": 1, "name": "Springfield High", "slug": "springfield-high" },
    "token": "eyJhbGciOiJIUzI1Ni..."
  }
}
```

### 1.2 User Login
- **Method**: `POST`
- **Endpoint**: `/api/auth/login`
- **Auth**: None (Public)
- **Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": 2,
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "ADMIN",
      "schoolId": 1
    }
  }
}
```

---

## 2. Self-Service Endpoints (`/api/me`)

Identity and tenant scopes are derived strictly from the verified JWT.

### 2.1 Get Authenticated User Profile
- **Method**: `GET`
- **Endpoint**: `/api/me`
- **Auth**: Required (Any authenticated role)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Rahul Sharma",
    "email": "rahul@example.com",
    "role": "STUDENT",
    "student": { "id": 1, "studentId": "STU_001", "semester": 1 }
  }
}
```

### 2.2 Get Role-Scoped Dashboard Metrics
- **Method**: `GET`
- **Endpoint**: `/api/me/dashboard`
- **Auth**: Required
- **Response** (`200 OK` for ADMIN):
```json
{
  "success": true,
  "data": {
    "studentsCount": 42,
    "teachersCount": 8,
    "classesCount": 4,
    "attendancePercentage": 94.5,
    "upcomingExamsCount": 2
  }
}
```

### 2.3 Get Authenticated Student Fees
- **Method**: `GET`
- **Endpoint**: `/api/me/fees`
- **Auth**: Required (`STUDENT` role)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "amount": 1200,
      "dueDate": "2026-09-01T00:00:00.000Z",
      "payments": [
        { "id": 5, "amount": 600, "paymentDate": "2026-08-15T10:00:00.000Z" }
      ]
    }
  ]
}
```

### 2.4 Get Student Attendance & Statistics
- **Method**: `GET`
- **Endpoint**: `/api/me/attendance` | `/api/me/attendance/stats`
- **Auth**: Required (`STUDENT` role)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "totalClasses": 40,
    "present": 38,
    "absent": 2,
    "percentage": 95.0
  }
}
```

### 2.5 Submit Student Assignment Solution
- **Method**: `POST`
- **Endpoint**: `/api/me/assignments/submit`
- **Auth**: Required (`STUDENT` role)
- **Request Body**:
```json
{
  "assignmentId": 12,
  "submissionText": "Solution repository: https://github.com/..."
}
```

---

## 3. Administration & Academics (`/api/*`)

### 3.1 Students Management (`/api/students`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | `SUPER_ADMIN`, `ADMIN`, `TEACHER` | Get paginated students list with filtering |
| `POST` | `/api/students` | `SUPER_ADMIN`, `ADMIN` | Onboard a new student record |
| `GET` | `/api/students/:id` | `SUPER_ADMIN`, `ADMIN`, `TEACHER` (or own ID for `STUDENT`) | Retrieve detailed student profile |
| `PUT` | `/api/students/:id` | `SUPER_ADMIN`, `ADMIN` | Update student profile & academic details |
| `DELETE` | `/api/students/:id` | `SUPER_ADMIN`, `ADMIN` | Archive/delete student record |

### 3.2 Faculty Management (`/api/teachers`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teachers` | `SUPER_ADMIN`, `ADMIN` | Get faculty list |
| `POST` | `/api/teachers` | `SUPER_ADMIN`, `ADMIN` | Create new teacher profile |
| `GET` | `/api/teachers/:id` | `SUPER_ADMIN`, `ADMIN` | Get teacher details |
| `PUT` | `/api/teachers/:id` | `SUPER_ADMIN`, `ADMIN` | Update teacher details & department |
| `DELETE` | `/api/teachers/:id` | `SUPER_ADMIN`, `ADMIN` | Remove teacher record |

### 3.3 Departments & Classes (`/api/departments`, `/api/courses`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/departments` | Authenticated | List institutional departments |
| `POST` | `/api/departments` | `SUPER_ADMIN`, `ADMIN` | Create department |
| `GET` | `/api/courses` | Authenticated | List courses/classes |
| `POST` | `/api/courses` | `SUPER_ADMIN`, `ADMIN` | Create course/class with capacity |

### 3.4 Subjects & Timetables (`/api/subjects`, `/api/timetable`)
| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/subjects` | Authenticated | List subjects |
| `POST` | `/api/subjects` | `SUPER_ADMIN`, `ADMIN` | Create subject with code & teacher |
| `GET` | `/api/timetable` | Authenticated | Fetch class/teacher timetable slots |
| `POST` | `/api/timetable` | `SUPER_ADMIN`, `ADMIN` | Create scheduled timetable slot |

---

## 4. Evaluation, Exams & Fees

### 4.1 Attendance (`/api/attendance`)
- **Method**: `POST`
- **Endpoint**: `/api/attendance`
- **Roles**: `SUPER_ADMIN`, `ADMIN`, `TEACHER`
- **Request Body**:
```json
{
  "studentId": 14,
  "subjectId": 3,
  "date": "2026-08-26",
  "status": "PRESENT"
}
```

### 4.2 Exams & Grading (`/api/exams`, `/api/marks`)
- **Method**: `POST`
- **Endpoint**: `/api/marks`
- **Roles**: `SUPER_ADMIN`, `ADMIN`, `TEACHER`
- **Request Body**:
```json
{
  "studentId": 14,
  "subjectId": 3,
  "examId": 5,
  "marks": 88
}
```

### 4.3 Fees & Payments (`/api/fees`, `/api/payments`)
- **Create Fee Invoice**: `POST /api/fees` (Roles: `ADMIN`, `SUPER_ADMIN`)
```json
{
  "studentId": 14,
  "amount": 1500,
  "dueDate": "2026-10-01"
}
```
- **Record Payment**: `POST /api/payments` (Roles: `ADMIN`, `SUPER_ADMIN`)
```json
{
  "feeId": 10,
  "amount": 500,
  "paymentMethod": "CASH"
}
```

---

## 5. Super Admin & System Settings (`/api/superadmin`)

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/superadmin/dashboard` | `SUPER_ADMIN` | Global institutional statistics |
| `GET` | `/api/superadmin/settings` | `SUPER_ADMIN` | List system settings |
| `PUT` | `/api/superadmin/settings` | `SUPER_ADMIN` | Update system configuration |
| `PUT` | `/api/superadmin/school` | `SUPER_ADMIN` | Update school profile & working days |
