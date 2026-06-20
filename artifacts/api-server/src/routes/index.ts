import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import customersRouter from "./customers";
import propertiesRouter from "./properties";
import tasksRouter from "./tasks";
import adminRouter from "./admin";
import paymentsRouter from "./payments";
import clientRouter from "./client";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/leads", leadsRouter);
router.use("/customers", customersRouter);
router.use("/properties", propertiesRouter);
router.use("/tasks", tasksRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentsRouter);
router.use("/client", clientRouter);

export default router;
