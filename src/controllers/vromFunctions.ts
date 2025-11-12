import type { Request, Response } from "express";
import { sendMessage } from "../twiloSetup/sendMessage.js";

export const userRequest = async(req: Request, res: Response) => {
    try{
        await sendMessage("Nosa", "✅ You're already registered as a rider.");

    }catch(error){
            res.status(500).json({
                "message": "Cannot work"
            })
            console.error(error)
    }

}