import express from "express";
import { forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { googleLogin } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/google-login", googleLogin);

export default router;