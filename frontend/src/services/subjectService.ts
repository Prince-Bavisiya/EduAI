import { request, API_URL } from "./apiClient";

export const getSubjects = async (params: { page?: number; limit?: number; search?: string; courseId?: number; teacherId?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.search) query.append("search", params.search);
  if (params.courseId) query.append("courseId", String(params.courseId));
  if (params.teacherId) query.append("teacherId", String(params.teacherId));

  return request(`/subjects?${query.toString()}`);
};

export const getSubjectById = async (id: number) => {
  return request(`/subjects/${id}`);
};

export const createSubject = async (subjectData: any) => {
  return request("/subjects", {
    method: "POST",
    body: JSON.stringify(subjectData),
  });
};

export const updateSubject = async (id: number, subjectData: any) => {
  return request(`/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify(subjectData),
  });
};

export const deleteSubject = async (id: number) => {
  return request(`/subjects/${id}`, {
    method: "DELETE",
  });
};
