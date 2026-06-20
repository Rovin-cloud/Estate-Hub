import { Router } from "express";
import { db, customersTable, paymentsTable, propertiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole, getUserId } from "../middlewares/requireRole";

const router = Router();

router.use(requireRole("client", "admin"));

async function getCustomerForUser(clerkUserId: string) {
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.clerkUserId, clerkUserId));
  return customer ?? null;
}

router.get("/me", async (req, res): Promise<void> => {
  try {
    const userId = getUserId(req)!;
    const customer = await getCustomerForUser(userId);
    if (!customer) { res.status(404).json({ error: "No client profile found. Contact your sales representative." }); return; }
    res.json({ ...customer, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get client profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/payments", async (req, res): Promise<void> => {
  try {
    const userId = getUserId(req)!;
    const customer = await getCustomerForUser(userId);
    if (!customer) { res.status(404).json({ error: "No client profile found" }); return; }

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.customerId, customer.id))
      .orderBy(paymentsTable.installmentNumber);

    res.json(payments.map((p) => ({
      ...p,
      totalAmount: parseFloat(p.totalAmount),
      paidAmount: parseFloat(p.paidAmount),
      remainingAmount: parseFloat(p.totalAmount) - parseFloat(p.paidAmount),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get client payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/properties", async (req, res): Promise<void> => {
  try {
    const userId = getUserId(req)!;
    const customer = await getCustomerForUser(userId);
    if (!customer) { res.status(404).json({ error: "No client profile found" }); return; }

    const payments = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.customerId, customer.id));

    const propertyIds = [...new Set(payments.map((p) => p.propertyId))];
    if (propertyIds.length === 0) { res.json([]); return; }

    const props = await Promise.all(
      propertyIds.map((id) => db.select().from(propertiesTable).where(eq(propertiesTable.id, id)).then((r) => r[0]))
    );

    res.json(props.filter(Boolean).map((p) => ({
      ...p,
      price: parseFloat(p!.price),
      createdAt: p!.createdAt.toISOString(),
      updatedAt: p!.updatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get client properties");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
