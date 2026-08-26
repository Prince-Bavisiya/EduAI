const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("eduai_token");
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

export const getAttendance = async (params: {
  date?: string;
  subjectId?: number;
  courseId?: number;
}) => {
  const query = new URLSearchParams();

  if (params.date) {
    query.set("date", params.date);
  }
  if (params.subjectId) {
    query.set("subjectId", String(params.subjectId));
  }
  if (params.courseId) {
    query.set("courseId", String(params.courseId));
  }

  const queryString = query.toString();
  return request(`/attendance${queryString ? `?${queryString}` : ""}`);
};

export const markAttendance = async (
  records: {
    studentId: number;
    subjectId: number;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE";
  }[]
) => {
  return request("/attendance", {
    method: "POST",
    body: JSON.stringify(records),
  });
};

export const updateAttendance = async (
  id: number,
  status: "PRESENT" | "ABSENT" | "LATE"
) => {
  return request(`/attendance/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
};

export const getStudentAttendanceStats = async (studentId: number) => {
  return request(`/attendance/student/${studentId}/stats`);
};

export const getStudentAttendance = async (studentId: number) => {
  return request(`/attendance/student/${studentId}`);
};
