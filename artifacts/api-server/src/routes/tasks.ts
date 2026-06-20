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

router.get("/", async (req, res) => {
  try {
    const query = GetTasksQueryParams.safeParse(req.query);
    const params = query.success ? query.data : {};

    const conditions: SQL[] = [];
    if (params.status) conditions.push(eq(tasksTable.status, params.status));
    if (params.leadId) conditions.push(eq(tasksTable.leadId, params.leadId));

    const tasks =
      conditions.length > 0
        ? await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.dueDate)
        : await db.select().from(tasksTable).orderBy(tasksTable.dueDate);

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

    const [task] = await db.insert(tasksTable).values(parsed.data).returning();

    let leadName: string | null = null;
    if (task.leadId) {
      const [lead] = await db.select({ name: leadsTable.name }).from(leadsTable).where(eq(leadsTable.id, task.leadId));
      leadName = lead?.name ?? null;
    }

    res.status(201).json({ ...task, leadName, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const { id } = GetTaskParams.parse({ id: Number(req.params.id) });
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) { res.status(404).json({ error: "Not found" }); return; }

    let leadName: string | null = null;
    if (task.leadId) {
      const [lead] = await db.select({ name: leadsTable.name }).from(leadsTable).where(eq(leadsTable.id, task.leadId));
      leadName = lead?.name ?? null;
    }

    res.json({ ...task, leadName, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() });
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

    const [task] = await db.update(tasksTable).set(parsed.data).where(eq(tasksTable.id, id)).returning();
    if (!task) { res.status(404).json({ error: "Not found" }); return; }

    let leadName: string | null = null;
    if (task.leadId) {
      const [lead] = await db.select({ name: leadsTable.name }).from(leadsTable).where(eq(leadsTable.id, task.leadId));
      leadName = lead?.name ?? null;
    }

    res.json({ ...task, leadName, createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
