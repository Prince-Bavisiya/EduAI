const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const login = async (credentials: { email: string; password: string }) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  let data: any = {};
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: `Backend error (${response.status}): ${response.statusText}` };
  }

  if (!response.ok) {
    throw new Error(data.message || "Invalid credentials");
  }

  return data; // returns { success, message, data: { user: { id, name, email, role }, token } }
};

export const register = async (userData: {
  name: string;
  email: string;
  password?: string;
  schoolName?: string;
  role?: string;
}) => {
  // Pass current token if creating admin/teacher
  const token = typeof window !== "undefined" ? localStorage.getItem("eduai_token") : null;

  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(userData),
  });

  let data: any = {};
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: `Backend error (${response.status}): ${response.statusText}` };
  }

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return data;
};
