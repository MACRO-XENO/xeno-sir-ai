import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAuthToken() {
  return localStorage.getItem("xeno_sir_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("xeno_sir_token", token);
}

export function clearAuth() {
  localStorage.removeItem("xeno_sir_token");
  localStorage.removeItem("xeno_sir_user");
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
