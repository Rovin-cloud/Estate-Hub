import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export type UserRole = "admin" | "sales_manager" | "sales_executive" | "client";

export function getUserRole(req: Request): string | null {
  const auth = getAuth(req);
  return ((auth.sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string) ?? null;
}

export function getUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = getAuth(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (roles.length > 0) {
      const role = ((auth.sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string) ?? null;
      if (!role || !roles.includes(role as UserRole)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
    next();
  };
}
