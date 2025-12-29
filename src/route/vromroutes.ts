import { Router } from "express";
import { handlePaystackWebhook, userRequest } from "../controllers/vromFunctions"

const router = Router();

router.post("/subscription", handlePaystackWebhook)
router.post("/", userRequest)

export default router;
