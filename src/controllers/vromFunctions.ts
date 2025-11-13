import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";

export const userRequest = async (req: Request, res: Response) => {
  try {
          const message = req.body.Body?.trim();

    //   const f = await sendMessage("+2348108505829", "You're already registered as a rider.");
    const f = await sendMessage(
      "+2348108505829",
      "👋 Hello! Welcome to Vrom!\n\nPlease reply with an option number:\n" +
        "1️⃣ Register as Rider\n" +
        "2️⃣ Request a Ride\n" +
        "3️⃣ Help"
    );

  if (message === "1") {
    await sendMessage("+2348108505829", "✅ You're registered as a Rider!");
  } else if (message === "2") {
    await sendMessage("+2348108505829", "🚗 You're registered as a Driver!");
  } else if (message === "3") {
    await sendMessage("+2348108505829", "📞 Contact support at +234...");
  } else {
    await sendMessage("+2348108505829", "❓ Please reply with 1, 2, or 3.");
  }

    console.log("function", f);
  } catch (error) {
    res.status(500).json({
      message: "Cannot work",
    });
    console.error(error);
  }
};
