import { Router } from "express";
import { db, propertiesTable } from "@workspace/db";
import { eq, ilike, or, and, SQL } from "drizzle-orm";
import {
  GetPropertiesQueryParams,
  CreatePropertyBody,
  GetPropertyParams,
  UpdatePropertyParams,
  UpdatePropertyBody,
  DeletePropertyParams,
} from "@workspace/api-zod";

const router = Router();

const fmt = (p: typeof propertiesTable.$inferSelect) => ({
  ...p,
  price: parseFloat(p.price),
  createdAt: p.createdAt.toISOString(),
  updatedAt: p.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const query = GetPropertiesQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 100));

    const conditions: SQL[] = [];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(propertiesTable.companyId, req.companyId));
    if (params.availability) conditions.push(eq(propertiesTable.availability, params.availability));
    if (req.query.type) conditions.push(eq(propertiesTable.type, String(req.query.type)));
    if (params.search) {
      conditions.push(
        or(
          ilike(propertiesTable.projectName, `%${params.search}%`),
          ilike(propertiesTable.location, `%${params.search}%`),
          ilike(propertiesTable.unitNumber, `%${params.search}%`),
        ) as SQL,
      );
    }

    const properties = await db
      .select()
      .from(propertiesTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(propertiesTable.createdAt)
      .limit(perPage)
      .offset((page - 1) * perPage);

    res.json(properties.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list properties");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreatePropertyBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [property] = await db
      .insert(propertiesTable)
      .values({ ...parsed.data, price: String(parsed.data.price), companyId: req.companyId ?? undefined })
      .returning();
    res.status(201).json(fmt(property));
  } catch (err) {
    req.log.error({ err }, "Failed to create property");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetPropertyParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(propertiesTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(propertiesTable.companyId, req.companyId));

    const [property] = await db.select().from(propertiesTable).where(and(...conditions));
    if (!property) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(property));
  } catch (err) {
    req.log.error({ err }, "Failed to get property");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = UpdatePropertyParams.parse({ id: Number(req.params.id) });
    const parsed = UpdatePropertyBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (updateData.price !== undefined) updateData.price = String(updateData.price);

    const conditions: SQL[] = [eq(propertiesTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(propertiesTable.companyId, req.companyId));

    const [property] = await db.update(propertiesTable).set(updateData).where(and(...conditions)).returning();
    if (!property) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(property));
  } catch (err) {
    req.log.error({ err }, "Failed to update property");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeletePropertyParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(propertiesTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(propertiesTable.companyId, req.companyId));

    await db.delete(propertiesTable).where(and(...conditions));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete property");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
