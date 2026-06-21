import { Router } from "express";
import { db, paymentsTable, insertPaymentSchema } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

const fmt = (p: typeof paymentsTable.$inferSelect) => ({
  ...p,
  totalAmount: parseFloat(p.totalAmount),
  paidAmount: parseFloat(p.paidAmount),
  remainingAmount: parseFloat(p.totalAmount) - parseFloat(p.paidAmount),
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

router.get("/", requireRole("admin", "company_admin", "sales_manager", "super_admin"), async (req, res): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 100));
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;

    const conditions: SQL[] = [];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(paymentsTable.companyId, req.companyId));
    if (customerId) conditions.push(eq(paymentsTable.customerId, customerId));

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(paymentsTable.dueDate)
      .limit(perPage)
      .offset((page - 1) * perPage);

    res.json(payments.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireRole("admin", "company_admin", "sales_manager", "super_admin"), async (req, res): Promise<void> => {
  try {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [payment] = await db
      .insert(paymentsTable)
      .values({ ...parsed.data, companyId: req.companyId ?? undefined })
      .returning();
    res.status(201).json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireRole("admin", "company_admin", "sales_manager", "super_admin"), async (req, res): Promise<void> => {
  try {
    const conditions: SQL[] = [eq(paymentsTable.id, Number(req.params["id"]))];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(paymentsTable.companyId, req.companyId));

    const [payment] = await db.select().from(paymentsTable).where(and(...conditions));
    if (!payment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireRole("admin", "company_admin", "sales_manager", "super_admin"), async (req, res): Promise<void> => {
  try {
    const parsed = insertPaymentSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const conditions: SQL[] = [eq(paymentsTable.id, Number(req.params["id"]))];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(paymentsTable.companyId, req.companyId));

    const [payment] = await db.update(paymentsTable).set(parsed.data).where(and(...conditions)).returning();
    if (!payment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to update payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireRole("admin", "company_admin", "super_admin"), async (req, res): Promise<void> => {
  try {
    const conditions: SQL[] = [eq(paymentsTable.id, Number(req.params["id"]))];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(paymentsTable.companyId, req.companyId));

    await db.delete(paymentsTable).where(and(...conditions));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
