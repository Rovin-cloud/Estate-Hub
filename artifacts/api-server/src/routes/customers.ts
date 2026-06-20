import { Router } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import {
  GetCustomersQueryParams,
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = GetCustomersQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const customers = params.search
      ? await db
          .select()
          .from(customersTable)
          .where(
            or(
              ilike(customersTable.name, `%${params.search}%`),
              ilike(customersTable.email, `%${params.search}%`),
              ilike(customersTable.phone, `%${params.search}%`),
            ),
          )
          .orderBy(customersTable.createdAt)
      : await db.select().from(customersTable).orderBy(customersTable.createdAt);

    res.json(customers.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [customer] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json({ ...customer, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetCustomerParams.parse({ id: Number(req.params.id) });
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
    if (!customer) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...customer, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = UpdateCustomerParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateCustomerBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [customer] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, id)).returning();
    if (!customer) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...customer, createdAt: customer.createdAt.toISOString(), updatedAt: customer.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteCustomerParams.parse({ id: Number(req.params.id) });
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
