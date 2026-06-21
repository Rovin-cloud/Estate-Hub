import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

/**
 * Tenant isolation middleware.
 *
 * Reads company_id from the user's Clerk publicMetadata and attaches it to
 * req.companyId so every downstream route can scope queries to the tenant.
 *
 * Super admins bypass tenant isolation (req.isSuperAdmin = true,
 * req.companyId = null) so they can view all companies.
 *
 * Must be mounted AFTER requireAuth so auth is already verified.
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const metadata = auth.sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
  const role = metadata?.role as string | undefined;

  if (role === "super_admin") {
    req.isSuperAdmin = true;
    req.companyId = null;
    next();
    return;
  }

  const rawCompanyId = metadata?.company_id;
  if (!rawCompanyId) {
    res.status(403).json({
      error: "No company assigned to your account. Contact your administrator.",
    });
    return;
  }

  const companyId = Number(rawCompanyId);
  if (Number.isNaN(companyId) || companyId <= 0) {
    res.status(403).json({ error: "Invalid company assignment. Contact your administrator." });
    return;
  }

  req.isSuperAdmin = false;
  req.companyId = companyId;
  next();
}
