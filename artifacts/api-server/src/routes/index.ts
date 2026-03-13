import { Router, type IRouter } from "express";
import healthRouter from "./health";
import modelsRouter from "./models";
import generateRouter from "./generate";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(modelsRouter);
router.use(generateRouter);
router.use(uploadRouter);

export default router;
