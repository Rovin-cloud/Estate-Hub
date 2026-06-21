import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

// Augment Express Request to carry tenant context set by tenantMiddleware
declare global {
  namespace Express {
    interface Request {
      companyId: number | null;
      isSuperAdmin: boolean;
    }
  }
}

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "admin"
  | "sales_manager"
  | "sales_executive"
  | "client";

export const VALID_ROLES: UserRole[] = [
  "super_admin",
  "company_admin",
  "admin",
  "sales_manager",
  "sales_executive",
  "client",
];

export function getUserRole(req: Request): UserRole | null {
  const auth = getAuth(req);
  const role = (auth.sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string;
  return (VALID_ROLES.includes(role as UserRole) ? role : null) as UserRole | null;
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
      const role = getUserRole(req);
      if (!role || !roles.includes(role)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }
    next();
  };
}
