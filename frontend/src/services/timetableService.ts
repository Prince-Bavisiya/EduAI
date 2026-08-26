import { request } from "./apiClient";

export const getTimetable = async (params: { day?: string; courseId?: number; semester?: number; teacherId?: number; studentId?: number } = {}) => {
  const query = new URLSearchParams();
  if (params.day) query.append("day", params.day);
  if (params.courseId) query.append("courseId", String(params.courseId));
  if (params.semester) query.append("semester", String(params.semester));
  if (params.teacherId) query.append("teacherId", String(params.teacherId));
  if (params.studentId) query.append("studentId", String(params.studentId));

  return request(`/timetable?${query.toString()}`);
};

export const getTimetableById = async (id: number) => {
  return request(`/timetable/${id}`);
};

export const createTimetable = async (timetableData: any) => {
  return request("/timetable", {
    method: "POST",
    body: JSON.stringify(timetableData),
  });
};

export const updateTimetable = async (id: number, timetableData: any) => {
  return request(`/timetable/${id}`, {
    method: "PUT",
    body: JSON.stringify(timetableData),
  });
};

export const deleteTimetable = async (id: number) => {
  return request(`/timetable/${id}`, {
    method: "DELETE",
  });
};
