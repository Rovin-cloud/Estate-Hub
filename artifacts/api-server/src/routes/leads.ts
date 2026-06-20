import { Router } from "express";
import { db, leadsTable } from "@workspace/db";
import { eq, ilike, and, SQL } from "drizzle-orm";
import {
  GetLeadsQueryParams,
  CreateLeadBody,
  GetLeadParams,
  UpdateLeadParams,
  UpdateLeadBody,
  DeleteLeadParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = GetLeadsQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const conditions: SQL[] = [];
    if (params.status) conditions.push(eq(leadsTable.status, params.status));
    if (params.source) conditions.push(eq(leadsTable.source, params.source));
    if (params.assignedTo) conditions.push(eq(leadsTable.assignedTo, params.assignedTo));
    if (params.search) conditions.push(ilike(leadsTable.name, `%${params.search}%`));

    const leads =
      conditions.length > 0
        ? await db.select().from(leadsTable).where(and(...conditions)).orderBy(leadsTable.createdAt)
        : await db.select().from(leadsTable).orderBy(leadsTable.createdAt);

    res.json(leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateLeadBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [lead] = await db.insert(leadsTable).values(parsed.data).returning();
    res.status(201).json({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetLeadParams.parse({ id: Number(req.params.id) });
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = UpdateLeadParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateLeadBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [lead] = await db.update(leadsTable).set(parsed.data).where(eq(leadsTable.id, id)).returning();
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteLeadParams.parse({ id: Number(req.params.id) });
    await db.delete(leadsTable).where(eq(leadsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
