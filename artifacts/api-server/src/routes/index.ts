import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import leadsRouter from "./leads";
import customersRouter from "./customers";
import propertiesRouter from "./properties";
import tasksRouter from "./tasks";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/dashboard", dashboardRouter);
router.use("/leads", leadsRouter);
router.use("/customers", customersRouter);
router.use("/properties", propertiesRouter);
router.use("/tasks", tasksRouter);

export default router;
