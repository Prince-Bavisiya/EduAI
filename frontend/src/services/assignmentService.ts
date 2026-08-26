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

export const getAssignments = async (params: { subjectId?: number } = {}) => {
  const query = params.subjectId ? `?subjectId=${params.subjectId}` : "";
  return request(`/assignments${query}`);
};

export const getAssignmentById = async (id: number) => {
  return request(`/assignments/${id}`);
};

export const createAssignment = async (assignmentData: {
  title: string;
  description?: string;
  deadline: string;
  maxMarks: number;
  subjectId: number;
}) => {
  return request("/assignments", {
    method: "POST",
    body: JSON.stringify(assignmentData),
  });
};

export const updateAssignment = async (
  id: number,
  assignmentData: {
    title?: string;
    description?: string;
    deadline?: string;
    maxMarks?: number;
    subjectId?: number;
  }
) => {
  return request(`/assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(assignmentData),
  });
};

export const deleteAssignment = async (id: number) => {
  return request(`/assignments/${id}`, {
    method: "DELETE",
  });
};

// Submissions
export const submitAssignment = async (assignmentId: number, studentId: number) => {
  return request(`/assignments/${assignmentId}/submissions`, {
    method: "POST",
    body: JSON.stringify({ studentId }),
  });
};

export const getSubmissionsByAssignment = async (assignmentId: number) => {
  return request(`/assignments/${assignmentId}/submissions`);
};

export const getStudentSubmissions = async (studentId: number) => {
  return request(`/assignments/submissions/student/${studentId}`);
};

export const gradeSubmission = async (
  submissionId: number,
  gradingData: {
    marks: number;
    feedback?: string;
  }
) => {
  return request(`/assignments/submissions/${submissionId}`, {
    method: "PUT",
    body: JSON.stringify(gradingData),
  });
};
