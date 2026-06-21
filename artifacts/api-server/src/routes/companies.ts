import { Router } from "express";
import { db, companiesTable, insertCompanySchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";
import { createClerkClient } from "@clerk/express";

const router = Router();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const fmt = (c: typeof companiesTable.$inferSelect) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

// GET /api/companies — list all companies (super_admin) or own company
router.get("/", requireRole("super_admin", "company_admin", "admin"), async (req, res): Promise<void> => {
  try {
    const auth = req as any;
    const meta = (auth.auth?.sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
    const role = meta.role as string;

    if (role === "super_admin") {
      const companies = await db.select().from(companiesTable).orderBy(companiesTable.createdAt);
      res.json(companies.map(fmt));
      return;
    }

    const companyId = Number(meta.company_id);
    if (!companyId) { res.status(403).json({ error: "No company assigned" }); return; }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    res.json(company ? [fmt(company)] : []);
  } catch (err) {
    req.log.error({ err }, "Failed to list companies");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/companies — create company (super_admin only)
router.post("/", requireRole("super_admin"), async (req, res): Promise<void> => {
  try {
    const parsed = insertCompanySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input", details: parsed.error.issues }); return; }

    const [company] = await db.insert(companiesTable).values(parsed.data).returning();
    res.status(201).json(fmt(company));
  } catch (err) {
    req.log.error({ err }, "Failed to create company");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/companies/:id
router.get("/:id", requireRole("super_admin", "company_admin", "admin"), async (req, res): Promise<void> => {
  try {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, Number(req.params["id"])));
    if (!company) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(company));
  } catch (err) {
    req.log.error({ err }, "Failed to get company");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/companies/:id
router.patch("/:id", requireRole("super_admin", "company_admin", "admin"), async (req, res): Promise<void> => {
  try {
    const parsed = insertCompanySchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [company] = await db
      .update(companiesTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(companiesTable.id, Number(req.params["id"])))
      .returning();
    if (!company) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(company));
  } catch (err) {
    req.log.error({ err }, "Failed to update company");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/companies/:id (super_admin only)
router.delete("/:id", requireRole("super_admin"), async (req, res): Promise<void> => {
  try {
    await db.delete(companiesTable).where(eq(companiesTable.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete company");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/companies/:id/assign-user — link a Clerk user to this company
router.post("/:id/assign-user", requireRole("super_admin"), async (req, res): Promise<void> => {
  try {
    const companyId = Number(req.params["id"]);
    const { userId, role } = req.body as { userId: string; role: string };

    const validRoles = ["company_admin", "admin", "sales_manager", "sales_executive", "client"];
    if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId));
    if (!company) { res.status(404).json({ error: "Company not found" }); return; }

    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role, company_id: companyId },
    });

    res.json({ success: true, userId, role, company_id: companyId });
  } catch (err) {
    req.log.error({ err }, "Failed to assign user to company");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
