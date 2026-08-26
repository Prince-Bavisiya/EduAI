import { request } from "./apiClient";

export const getTeachers = async (params: { page?: number; limit?: number; search?: string; departmentId?: number; courseId?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.search) query.append("search", params.search);
  if (params.departmentId) query.append("departmentId", String(params.departmentId));
  if (params.courseId) query.append("courseId", String(params.courseId));

  return request(`/teachers?${query.toString()}`);
};

export const getTeacherById = async (id: number) => {
  return request(`/teachers/${id}`);
};

export const createTeacher = async (teacherData: any) => {
  return request("/teachers", {
    method: "POST",
    body: JSON.stringify(teacherData),
  });
};

export const updateTeacher = async (id: number, teacherData: any) => {
  return request(`/teachers/${id}`, {
    method: "PUT",
    body: JSON.stringify(teacherData),
  });
};

export const deleteTeacher = async (id: number) => {
  return request(`/teachers/${id}`, {
    method: "DELETE",
  });
};
