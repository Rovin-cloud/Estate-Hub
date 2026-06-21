import { Router } from "express";
import { createClerkClient, getAuth } from "@clerk/express";
import { requireRole, getUserRole, VALID_ROLES } from "../middlewares/requireRole";
import { requireTenant } from "../middlewares/tenantMiddleware";
import { db, leadsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";

const router = Router();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// All admin routes require at minimum these roles
router.use(requireRole("admin", "company_admin", "sales_manager", "super_admin"));

// GET /api/admin/users
router.get("/users", async (req, res): Promise<void> => {
  try {
    const response = await clerkClient.users.getUserList({ limit: 100 });
    const role = getUserRole(req);
    const companyId = (getAuth(req).sessionClaims?.publicMetadata as Record<string, unknown>)?.company_id;

    let users = response.data.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      role: (u.publicMetadata?.role as string) ?? null,
      companyId: (u.publicMetadata?.company_id as number) ?? null,
      createdAt: new Date(u.createdAt).toISOString(),
    }));

    // Non-super-admins only see users in their own company
    if (role !== "super_admin" && companyId) {
      users = users.filter((u) => u.companyId === Number(companyId));
    }

    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:userId/role — update role (and optionally company_id)
router.patch("/users/:userId/role", requireRole("admin", "company_admin", "super_admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.params["userId"] as string;
    const { role, company_id } = req.body as { role: string; company_id?: number };

    if (!VALID_ROLES.includes(role as any)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }

    const currentUserRole = getUserRole(req);
    // Non-super-admins cannot grant super_admin
    if (role === "super_admin" && currentUserRole !== "super_admin") {
      res.status(403).json({ error: "Only super admins can grant super_admin role" });
      return;
    }

    const metadata: Record<string, unknown> = { role };
    if (company_id !== undefined) metadata.company_id = company_id;

    // Preserve existing company_id if not changing it
    if (company_id === undefined && currentUserRole !== "super_admin") {
      const meta = (getAuth(req).sessionClaims?.publicMetadata as Record<string, unknown>);
      metadata.company_id = meta?.company_id;
    }

    await clerkClient.users.updateUser(userId, { publicMetadata: metadata });
    res.json({ success: true, userId, role, company_id: metadata.company_id });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/leads/:id/assign — assign lead to salesperson
router.patch("/leads/:id/assign", requireTenant, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { assignedTo } = req.body as { assignedTo: string | null };

    const conditions: SQL[] = [eq(leadsTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(leadsTable.companyId, req.companyId));

    const [lead] = await db
      .update(leadsTable)
      .set({ assignedTo: assignedTo ?? null })
      .where(and(...conditions))
      .returning();

    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to assign lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/leads — list all leads for admin/manager
router.get("/leads", requireTenant, async (req, res): Promise<void> => {
  try {
    const conditions: SQL[] = [];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(leadsTable.companyId, req.companyId));

    const leads = await db
      .select()
      .from(leadsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(leadsTable.createdAt);
    res.json(leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads for admin");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
