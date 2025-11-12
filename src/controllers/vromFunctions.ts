import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";

export const userRequest = async(req: Request, res: Response) => {
    try{
      const f = await sendMessage("+2348108505829", "You're already registered as a rider.");
            console.log(f)
    }catch(error){
            res.status(500).json({
                "message": "Cannot work"
            })
            console.error(error)
    }

}