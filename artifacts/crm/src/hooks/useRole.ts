import { useUser, useAuth } from "@clerk/react";
import { useCallback } from "react";

export type UserRole = "admin" | "sales_manager" | "sales_executive" | "client" | null;

export function useRole(): UserRole {
  const { user } = useUser();
  return ((user?.publicMetadata?.role as string) ?? null) as UserRole;
}

export function useIsAdmin() {
  return useRole() === "admin";
}

export function useIsSalesManager() {
  const role = useRole();
  return role === "admin" || role === "sales_manager";
}

export function useIsSales() {
  const role = useRole();
  return role === "admin" || role === "sales_manager" || role === "sales_executive";
}

export function useIsClient() {
  return useRole() === "client";
}

export function useAuthFetch() {
  const { getToken } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error ?? "Request failed");
    }
    if (res.status === 204) return null;
    return res.json();
  }, [getToken]);
}
