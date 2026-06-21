import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireRole";
import { requireTenant } from "../middlewares/tenantMiddleware";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import customersRouter from "./customers";
import propertiesRouter from "./properties";
import tasksRouter from "./tasks";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import clientRouter from "./client";
import companiesRouter from "./companies";

const router: IRouter = Router();

// Health check — no auth required
router.use(healthRouter);

// All other API routes require authentication
router.use(requireAuth);

// Company management — super_admin only, no tenant filter needed
router.use("/companies", companiesRouter);

// Client portal — tenant isolation handled internally (scoped to clerk_user_id)
router.use("/client", clientRouter);

// Admin routes — tenant filter applied inside admin routes
router.use("/admin", adminRouter);

// All CRM routes require both auth + tenant context
router.use(requireTenant);

router.use("/dashboard", dashboardRouter);
router.use("/leads", leadsRouter);
router.use("/customers", customersRouter);
router.use("/properties", propertiesRouter);
router.use("/tasks", tasksRouter);
router.use("/payments", paymentsRouter);

export default router;
