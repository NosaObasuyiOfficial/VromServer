import { Router } from "express";
import { userRequest } from "../controllers/vromFunctions.js"

const router = Router();

router.post("/", userRequest)

export default router;
