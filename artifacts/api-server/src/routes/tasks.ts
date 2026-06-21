import { Router } from "express";
import { db, tasksTable, leadsTable } from "@workspace/db";
import { eq, and, SQL } from "drizzle-orm";
import {
  GetTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router = Router();

async function withLeadName(task: typeof tasksTable.$inferSelect) {
  let leadName: string | null = null;
  if (task.leadId) {
    const [lead] = await db.select({ name: leadsTable.name }).from(leadsTable).where(eq(leadsTable.id, task.leadId));
    leadName = lead?.name ?? null;
  }
  return {
    ...task,
    leadName,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const query = GetTasksQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(req.query.perPage) || 100));

    const conditions: SQL[] = [];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(tasksTable.companyId, req.companyId));
    if (params.status) conditions.push(eq(tasksTable.status, params.status));
    if (params.leadId) conditions.push(eq(tasksTable.leadId, params.leadId));

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(tasksTable.dueDate)
      .limit(perPage)
      .offset((page - 1) * perPage);

    const leadsData = await db.select({ id: leadsTable.id, name: leadsTable.name }).from(leadsTable);
    const leadMap = Object.fromEntries(leadsData.map((l) => [l.id, l.name]));

    res.json(
      tasks.map((t) => ({
        ...t,
        leadName: t.leadId ? (leadMap[t.leadId] ?? null) : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res): Promise<void> => {
  try {
    const parsed = CreateTaskBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const [task] = await db
      .insert(tasksTable)
      .values({ ...parsed.data, companyId: req.companyId ?? undefined })
      .returning();
    res.status(201).json(await withLeadName(task));
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetTaskParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(tasksTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(tasksTable.companyId, req.companyId));

    const [task] = await db.select().from(tasksTable).where(and(...conditions));
    if (!task) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await withLeadName(task));
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = UpdateTaskParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateTaskBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

    const conditions: SQL[] = [eq(tasksTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(tasksTable.companyId, req.companyId));

    const [task] = await db.update(tasksTable).set(parsed.data).where(and(...conditions)).returning();
    if (!task) { res.status(404).json({ error: "Not found" }); return; }
    res.json(await withLeadName(task));
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
    const conditions: SQL[] = [eq(tasksTable.id, id)];
    if (!req.isSuperAdmin && req.companyId) conditions.push(eq(tasksTable.companyId, req.companyId));

    await db.delete(tasksTable).where(and(...conditions));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
