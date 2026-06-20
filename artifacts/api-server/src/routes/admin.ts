import { Router } from "express";
import { createClerkClient, getAuth } from "@clerk/express";
import { requireRole } from "../middlewares/requireRole";
import { db, leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

router.use(requireRole("admin", "sales_manager"));

router.get("/users", async (req, res): Promise<void> => {
  try {
    const response = await clerkClient.users.getUserList({ limit: 100 });
    const users = response.data.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? "",
      imageUrl: u.imageUrl,
      role: (u.publicMetadata?.role as string) ?? null,
      createdAt: new Date(u.createdAt).toISOString(),
    }));
    res.json(users);
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:userId/role", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const userId = req.params["userId"] as string;
    const { role } = req.body as { role: string };
    const validRoles = ["admin", "sales_manager", "sales_executive", "client"];
    if (!validRoles.includes(role)) { res.status(400).json({ error: "Invalid role" }); return; }

    await clerkClient.users.updateUser(userId, { publicMetadata: { role } });
    res.json({ success: true, userId, role });
  } catch (err) {
    req.log.error({ err }, "Failed to update user role");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/leads/:id/assign", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { assignedTo } = req.body as { assignedTo: string | null };

    const [lead] = await db
      .update(leadsTable)
      .set({ assignedTo: assignedTo ?? null })
      .where(eq(leadsTable.id, id))
      .returning();

    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    res.json({ ...lead, createdAt: lead.createdAt.toISOString(), updatedAt: lead.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to assign lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/leads", async (req, res): Promise<void> => {
  try {
    const leads = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);
    res.json(leads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list leads for admin");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
