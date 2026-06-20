import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable, tasksTable, propertiesTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [totalLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable);
    const [newLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.status, "New"));
    const [hotLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.status, "Interested"));
    const [siteVisits] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.status, "Site Visit"));
    const [bookings] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(eq(leadsTable.status, "Booking"));
    const [soldThisMonth] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(
      and(eq(leadsTable.status, "Sold"), gte(leadsTable.createdAt, new Date(firstOfMonth)))
    );

    res.json({
      totalLeads: totalLeads.count,
      newLeads: newLeads.count,
      hotLeads: hotLeads.count,
      siteVisits: siteVisits.count,
      bookings: bookings.count,
      soldThisMonth: soldThisMonth.count,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pipeline", async (req, res) => {
  try {
    const stages = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Booking", "Sold"];
    const rows = await db
      .select({ status: leadsTable.status, count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .groupBy(leadsTable.status);

    const countMap = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    const result = stages.map((stage) => ({ stage, count: countMap[stage] ?? 0 }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get pipeline breakdown");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const recentLeads = await db
      .select({ id: leadsTable.id, name: leadsTable.name, status: leadsTable.status, createdAt: leadsTable.createdAt })
      .from(leadsTable)
      .orderBy(sql`${leadsTable.createdAt} desc`)
      .limit(5);

    const recentTasks = await db
      .select({ id: tasksTable.id, title: tasksTable.title, status: tasksTable.status, createdAt: tasksTable.createdAt })
      .from(tasksTable)
      .orderBy(sql`${tasksTable.createdAt} desc`)
      .limit(5);

    const activity = [
      ...recentLeads.map((l) => ({
        id: l.id,
        type: "lead",
        description: `Lead "${l.name}" — ${l.status}`,
        createdAt: l.createdAt.toISOString(),
      })),
      ...recentTasks.map((t) => ({
        id: t.id + 10000,
        type: "task",
        description: `Task "${t.title}" — ${t.status}`,
        createdAt: t.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json(activity);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
