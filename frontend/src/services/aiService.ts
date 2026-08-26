import { request } from "./apiClient";

export const getStudentAnalysis = async (studentId?: number) => {
  const query = studentId ? `?studentId=${studentId}` : "";
  return request(`/ai/analysis${query}`);
};

export const regenerateStudentAnalysis = async (studentId?: number) => {
  return request("/ai/analysis/regenerate", {
    method: "POST",
    body: JSON.stringify(studentId ? { studentId } : {}),
  });
};

export const sendChatMessage = async (message: string, history: any[] = [], studentId?: number) => {
  return request("/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      history,
      ...(studentId ? { studentId } : {}),
    }),
  });
};
export const getStudentAnalytics = async (studentId: number) => {
  return request(`/ai/analytics/${studentId}`);
};
