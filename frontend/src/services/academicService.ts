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

export const getDepartments = async () => {
  return request("/departments");
};

export const getCourses = async (departmentId?: number) => {
  const query = departmentId ? `?departmentId=${departmentId}` : "";
  return request(`/courses${query}`);
};

export const getCourseById = async (id: number) => {
  return request(`/courses/${id}`);
};
