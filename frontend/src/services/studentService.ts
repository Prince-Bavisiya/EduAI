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

export const getStudents = async ({
  page = 1,
  limit = 10,
  search = "",
  courseId = "",
  departmentId = "",
}: {
  page?: number;
  limit?: number;
  search?: string;
  courseId?: string;
  departmentId?: string;
}) => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (search) params.set("search", search);
  if (courseId) params.set("courseId", courseId);
  if (departmentId) params.set("departmentId", departmentId);

  return request(`/students?${params.toString()}`);
};

export const deleteStudent = async (id: number) => {
  return request(`/students/${id}`, {
    method: "DELETE",
  });
};

export const createStudent = async (studentData: {
  name: string;
  email: string;
  password: string;
  studentId: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  semester: number;
  courseId: number;
  departmentId: number;
}) => {
  return request("/students", {
    method: "POST",
    body: JSON.stringify(studentData),
  });
};

export const getStudentById = async (id: number) => {
  return request(`/students/${id}`);
};

export const updateStudent = async (
  id: number,
  studentData: {
    name?: string;
    email?: string;
    password?: string;
    studentId?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    semester?: number;
    courseId?: number;
    parentId?: number | null;
  }
) => {
  return request(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(studentData),
  });
};
