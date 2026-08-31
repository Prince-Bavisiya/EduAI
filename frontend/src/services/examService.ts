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

// Exam API Calls
export const getExams = async (params: { subjectId?: number } = {}) => {
  const query = params.subjectId ? `?subjectId=${params.subjectId}` : "";
  return request(`/exams${query}`);
};

export const getExamById = async (id: number) => {
  return request(`/exams/${id}`);
};

export const createExam = async (examData: {
  name: string;
  semester: number;
  examDate: string;
  totalMarks: number;
  subjectId: number;
}) => {
  return request("/exams", {
    method: "POST",
    body: JSON.stringify(examData),
  });
};

export const updateExam = async (
  id: number,
  examData: {
    name?: string;
    semester?: number;
    examDate?: string;
    totalMarks?: number;
    subjectId?: number;
  }
) => {
  return request(`/exams/${id}`, {
    method: "PUT",
    body: JSON.stringify(examData),
  });
};

export const deleteExam = async (id: number) => {
  return request(`/exams/${id}`, {
    method: "DELETE",
  });
};

// Marks API Calls
export const enterMark = async (markData: {
  studentId: number;
  subjectId: number;
  examId: number;
  marks: number;
}) => {
  return request("/marks", {
    method: "POST",
    body: JSON.stringify(markData),
  });
};

export const getMarksByStudent = async (studentId: number) => {
  return request(`/marks/student/${studentId}`);
};

export const getMarksByExam = async (examId: number) => {
  return request(`/marks/exam/${examId}`);
};

export const updateMark = async (id: number, marks: number) => {
  return request(`/marks/${id}`, {
    method: "PUT",
    body: JSON.stringify({ marks }),
  });
};

export const deleteMark = async (id: number) => {
  return request(`/marks/${id}`, {
    method: "DELETE",
  });
};
