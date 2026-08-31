import { API_URL } from "./apiClient";

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

export const getMyProfile = async () => {
  return request("/me");
};

export const getMyAttendance = async () => {
  return request("/me/attendance");
};

export const getMyAttendanceStats = async () => {
  return request("/me/attendance/stats");
};

export const getMyMarks = async () => {
  return request("/me/marks");
};

export const getMyAssignments = async () => {
  return request("/me/assignments");
};

export const getMyFees = async () => {
  return request("/me/fees");
};

export const submitAssignment = async (assignmentId: number) => {
  return request(`/assignments/${assignmentId}/submissions`, {
    method: "POST",
    body: JSON.stringify({}), // Backend automatically overrides studentId from claims
  });
};
