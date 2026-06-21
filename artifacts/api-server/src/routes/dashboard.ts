import { Router } from "express";
import { db, leadsTable, tasksTable, propertiesTable, paymentsTable } from "@workspace/db";
import { eq, sql, and, gte, SQL } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenantCond = (!req.isSuperAdmin && req.companyId)
      ? eq(leadsTable.companyId, req.companyId)
      : undefined;

    const [totalLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable).where(tenantCond);
    const [newLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(tenantCond ? and(tenantCond, eq(leadsTable.status, "New")) : eq(leadsTable.status, "New"));
    const [hotLeads] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(tenantCond ? and(tenantCond, eq(leadsTable.status, "Interested")) : eq(leadsTable.status, "Interested"));
    const [siteVisits] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(tenantCond ? and(tenantCond, eq(leadsTable.status, "Site Visit")) : eq(leadsTable.status, "Site Visit"));
    const [bookings] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(tenantCond ? and(tenantCond, eq(leadsTable.status, "Booking")) : eq(leadsTable.status, "Booking"));
    const [soldThisMonth] = await db.select({ count: sql<number>`count(*)::int` }).from(leadsTable)
      .where(tenantCond
        ? and(tenantCond, eq(leadsTable.status, "Sold"), gte(leadsTable.createdAt, firstOfMonth))
        : and(eq(leadsTable.status, "Sold"), gte(leadsTable.createdAt, firstOfMonth)));

    // Revenue: sum of paid amounts this month
    const payCond = (!req.isSuperAdmin && req.companyId) ? eq(paymentsTable.companyId, req.companyId) : undefined;
    const [revenue] = await db.select({ total: sql<string>`coalesce(sum(paid_amount), 0)::text` })
      .from(paymentsTable)
      .where(payCond);

    res.json({
      totalLeads: totalLeads.count,
      newLeads: newLeads.count,
      hotLeads: hotLeads.count,
      siteVisits: siteVisits.count,
      bookings: bookings.count,
      soldThisMonth: soldThisMonth.count,
      totalRevenue: parseFloat(revenue?.total ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pipeline", async (req, res) => {
  try {
    const tenantCond = (!req.isSuperAdmin && req.companyId)
      ? eq(leadsTable.companyId, req.companyId)
      : undefined;

    const stages = ["New", "Contacted", "Interested", "Site Visit", "Negotiation", "Booking", "Sold"];
    const rows = await db
      .select({ status: leadsTable.status, count: sql<number>`count(*)::int` })
      .from(leadsTable)
      .where(tenantCond)
      .groupBy(leadsTable.status);

    const countMap = Object.fromEntries(rows.map((r) => [r.status, r.count]));
    res.json(stages.map((stage) => ({ stage, count: countMap[stage] ?? 0 })));
  } catch (err) {
    req.log.error({ err }, "Failed to get pipeline breakdown");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activity", async (req, res) => {
  try {
    const leadCond = (!req.isSuperAdmin && req.companyId) ? eq(leadsTable.companyId, req.companyId) : undefined;
    const taskCond = (!req.isSuperAdmin && req.companyId) ? eq(tasksTable.companyId, req.companyId) : undefined;

    const recentLeads = await db
      .select({ id: leadsTable.id, name: leadsTable.name, status: leadsTable.status, createdAt: leadsTable.createdAt })
      .from(leadsTable)
      .where(leadCond)
      .orderBy(sql`${leadsTable.createdAt} desc`)
      .limit(5);

    const recentTasks = await db
      .select({ id: tasksTable.id, title: tasksTable.title, status: tasksTable.status, createdAt: tasksTable.createdAt })
      .from(tasksTable)
      .where(taskCond)
      .orderBy(sql`${tasksTable.createdAt} desc`)
      .limit(5);

    const activity = [
      ...recentLeads.map((l) => ({ id: l.id, type: "lead", description: `Lead "${l.name}" — ${l.status}`, createdAt: l.createdAt.toISOString() })),
      ...recentTasks.map((t) => ({ id: t.id + 10000, type: "task", description: `Task "${t.title}" — ${t.status}`, createdAt: t.createdAt.toISOString() })),
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
