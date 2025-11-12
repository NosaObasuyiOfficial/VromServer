import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";

export const userRequest = async(req: Request, res: Response) => {
    try{
        await sendMessage("2348108505829", "✅ You're already registered as a rider.");

    }catch(error){
            res.status(500).json({
                "message": "Cannot work"
            })
            console.error(error)
    }

}