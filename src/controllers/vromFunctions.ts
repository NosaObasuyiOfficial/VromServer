import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";

export const userRequest = async (req: Request, res: Response) => {
  try {
    const whatsappMessage = req.body.Body?.trim();

    //   const f = await sendMessage("+2348108505829", "You're already registered as a rider.");

    if (whatsappMessage === "1") {
      await sendMessage("+2348108505829", "✅ You're registered as a Rider!");
    } else if (whatsappMessage === "2") {
      await sendMessage("+2348108505829", "🚗 You're registered as a Driver!");
    } else if (whatsappMessage === "3") {
      await sendMessage("+2348108505829", "📞 Contact support at +234...");
    } else {
      await sendMessage(
        "+2348108505829",
        "👋 Hello! Welcome to Vrom!\n\nChoose an option:\n" +
          "1️⃣ Register as Rider🏍\n" +
          "2️⃣ Request a Ride\n" +
          "3️⃣ Help"
      );
      await sendMessage("+2348108505829", "❓ Please reply with 1, 2, or 3.");
    }

  } catch (error) {
    res.status(500).json({
      message: "Cannot work",
    });
    console.error(error);
  }
};
