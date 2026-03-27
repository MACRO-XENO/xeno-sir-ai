import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import lecturesRouter from "./lectures";
import studentsRouter from "./students";
import chatRouter from "./chat";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(lecturesRouter);
router.use(studentsRouter);
router.use(chatRouter);
router.use(openaiRouter);

export default router;
