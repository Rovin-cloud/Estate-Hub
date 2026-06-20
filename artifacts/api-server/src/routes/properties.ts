import { Router } from "express";
import { db, propertiesTable } from "@workspace/db";
import { eq, ilike, or, and } from "drizzle-orm";
import {
  GetPropertiesQueryParams,
  CreatePropertyBody,
  GetPropertyParams,
  UpdatePropertyParams,
  UpdatePropertyBody,
  DeletePropertyParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = GetPropertiesQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const conds = [];
    if (params.availability) conds.push(eq(propertiesTable.availability, params.availability));
    if (params.search) {
      conds.push(
        or(
          ilike(propertiesTable.projectName, `%${params.search}%`),
          ilike(propertiesTable.location, `%${params.search}%`),
          ilike(propertiesTable.unitNumber, `%${params.search}%`),
        ),
      );
    }

    const properties =
      conds.length > 0
        ? await db.select().from(propertiesTable).where(and(...conds)).orderBy(propertiesTable.createdAt)
        : await db.select().from(propertiesTable).orderBy(propertiesTable.createdAt);

    res.json(
      properties.map((p) => ({
        ...p,
        price: parseFloat(p.price),
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    );
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
      .values({ ...parsed.data, price: String(parsed.data.price) })
      .returning();
    res.status(201).json({
      ...property,
      price: parseFloat(property.price),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create property");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetPropertyParams.parse({ id: Number(req.params.id) });
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!property) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...property,
      price: parseFloat(property.price),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
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

    const [property] = await db.update(propertiesTable).set(updateData).where(eq(propertiesTable.id, id)).returning();
    if (!property) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...property,
      price: parseFloat(property.price),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update property");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeletePropertyParams.parse({ id: Number(req.params.id) });
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete property");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
