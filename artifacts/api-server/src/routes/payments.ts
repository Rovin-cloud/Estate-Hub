import { Router } from "express";
import { db, paymentsTable, insertPaymentSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/", requireRole("admin", "sales_manager"), async (req, res): Promise<void> => {
  try {
    const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
    const payments = customerId
      ? await db.select().from(paymentsTable).where(eq(paymentsTable.customerId, customerId)).orderBy(paymentsTable.installmentNumber)
      : await db.select().from(paymentsTable).orderBy(paymentsTable.dueDate);
    res.json(payments.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireRole("admin", "sales_manager"), async (req, res): Promise<void> => {
  try {
    const parsed = insertPaymentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [payment] = await db.insert(paymentsTable).values(parsed.data).returning();
    res.status(201).json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to create payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", requireRole("admin", "sales_manager"), async (req, res): Promise<void> => {
  try {
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, Number(req.params["id"])));
    if (!payment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to get payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", requireRole("admin", "sales_manager"), async (req, res): Promise<void> => {
  try {
    const parsed = insertPaymentSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }
    const [payment] = await db
      .update(paymentsTable)
      .set(parsed.data)
      .where(eq(paymentsTable.id, Number(req.params["id"])))
      .returning();
    if (!payment) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(payment));
  } catch (err) {
    req.log.error({ err }, "Failed to update payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    await db.delete(paymentsTable).where(eq(paymentsTable.id, Number(req.params["id"])));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
