const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://app-7a52b6cc-39b3-46c8-9ae5-396601674105.cleverapps.io/api";
export const API_URL = rawApiUrl.replace(/\/+$/, "").endsWith("/api")
  ? rawApiUrl.replace(/\/+$/, "")
  : `${rawApiUrl.replace(/\/+$/, "")}/api`;

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("eduai_token");
};

export const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data: any = {};
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const errorMessage = data.message || "An unexpected error occurred.";

    // Global session interception: 401 Unauthorized
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("eduai_token");
        localStorage.removeItem("eduai_user");
        // Only redirect if not already on the login page to avoid redirect loops
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login?error=" + encodeURIComponent("Your session has expired. Please login again.");
        }
      }
    }

    const error: any = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  return data;
};
