import { Router } from "express";
import { db, customersTable } from "@workspace/db";
import { eq, ilike, or, and, SQL } from "drizzle-orm";
import {
  GetCustomersQueryParams,
  CreateCustomerBody,
  GetCustomerParams,
  UpdateCustomerParams,
  UpdateCustomerBody,
  DeleteCustomerParams,
} from "@workspace/api-zod";

const router = Router();

const fmt = (c: typeof customersTable.$inferSelect) => ({
  ...c,
  createdAt: c.createdAt.toISOString(),
  updatedAt: c.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const query = GetCustomersQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 100));

    const conditions: SQL[] = [];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(customersTable.companyId, req.companyId));
    if (params.search) {
      conditions.push(
        or(
          ilike(customersTable.name, `%${params.search}%`),
          ilike(customersTable.email, `%${params.search}%`),
          ilike(customersTable.phone, `%${params.search}%`),
        ) as SQL,
      );
    }

    const customers = await db
      .select()
      .from(customersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(customersTable.createdAt)
      .limit(perPage)
      .offset((page - 1) * perPage);

    res.json(customers.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list customers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [customer] = await db
      .insert(customersTable)
      .values({ ...parsed.data, companyId: req.companyId ?? undefined })
      .returning();
    res.status(201).json(fmt(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetCustomerParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(customersTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(customersTable.companyId, req.companyId));

    const [customer] = await db.select().from(customersTable).where(and(...conditions));
    if (!customer) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(customer));
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

    const conditions: SQL[] = [eq(customersTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(customersTable.companyId, req.companyId));

    const [customer] = await db.update(customersTable).set(parsed.data).where(and(...conditions)).returning();
    if (!customer) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(customer));
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteCustomerParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(customersTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(customersTable.companyId, req.companyId));

    await db.delete(customersTable).where(and(...conditions));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
