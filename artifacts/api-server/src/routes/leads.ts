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
import { getUserRole, getUserId } from "../middlewares/requireRole";

const router = Router();

function paginate(query: Record<string, unknown>) {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(200, Math.max(1, Number(query.perPage) || 100));
  return { limit: perPage, offset: (page - 1) * perPage, page, perPage };
}

const fmt = (l: typeof leadsTable.$inferSelect) => ({
  ...l,
  createdAt: l.createdAt.toISOString(),
  updatedAt: l.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const role = getUserRole(req);
    const userId = getUserId(req);
    const query = GetLeadsQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};
    const { limit, offset } = paginate(req.query as Record<string, unknown>);

    const conditions: SQL[] = [];

    // Tenant isolation
    if (!req.isSuperAdmin && req.companyId) {
      conditions.push(eq(leadsTable.companyId, req.companyId));
    }

    // Sales executive only sees their assigned leads
    if (role === "sales_executive" && userId) {
      conditions.push(eq(leadsTable.assignedTo, userId));
    }

    if (params.status) conditions.push(eq(leadsTable.status, params.status));
    if (params.source) conditions.push(eq(leadsTable.source, params.source));
    if (params.assignedTo) conditions.push(eq(leadsTable.assignedTo, params.assignedTo));
    if (params.search) conditions.push(ilike(leadsTable.name, `%${params.search}%`));

    const leads = await db
      .select()
      .from(leadsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(leadsTable.createdAt)
      .limit(limit)
      .offset(offset);

    res.setHeader("X-Page", String(Math.ceil(offset / limit) + 1));
    res.setHeader("X-Per-Page", String(limit));
    res.json(leads.map(fmt));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateLeadBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [lead] = await db
      .insert(leadsTable)
      .values({ ...parsed.data, companyId: req.companyId ?? undefined })
      .returning();
    res.status(201).json(fmt(lead));
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetLeadParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(leadsTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(leadsTable.companyId, req.companyId));

    const [lead] = await db.select().from(leadsTable).where(and(...conditions));
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(lead));
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

    const conditions: SQL[] = [eq(leadsTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(leadsTable.companyId, req.companyId));

    const [lead] = await db.update(leadsTable).set(parsed.data).where(and(...conditions)).returning();
    if (!lead) { res.status(404).json({ error: "Not found" }); return; }
    res.json(fmt(lead));
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteLeadParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(leadsTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(leadsTable.companyId, req.companyId));

    await db.delete(leadsTable).where(and(...conditions));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
