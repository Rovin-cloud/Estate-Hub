import { useUser, useAuth } from "@clerk/react";
import { useCallback } from "react";

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "admin"
  | "sales_manager"
  | "sales_executive"
  | "client"
  | null;

export function useRole(): UserRole {
  const { user } = useUser();
  return ((user?.publicMetadata?.role as string) ?? null) as UserRole;
}

export function useCompanyId(): number | null {
  const { user } = useUser();
  const raw = user?.publicMetadata?.company_id;
  return raw ? Number(raw) : null;
}

export function useIsSuperAdmin() {
  return useRole() === "super_admin";
}

export function useIsCompanyAdmin() {
  const role = useRole();
  return role === "super_admin" || role === "company_admin";
}

export function useIsAdmin() {
  const role = useRole();
  return role === "super_admin" || role === "company_admin" || role === "admin";
}

export function useIsSalesManager() {
  const role = useRole();
  return (
    role === "super_admin" ||
    role === "company_admin" ||
    role === "admin" ||
    role === "sales_manager"
  );
}

export function useIsSales() {
  const role = useRole();
  return (
    role === "super_admin" ||
    role === "company_admin" ||
    role === "admin" ||
    role === "sales_manager" ||
    role === "sales_executive"
  );
}

export function useIsClient() {
  return useRole() === "client";
}

export function useAuthFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
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
    },
    [getToken],
  );
}
