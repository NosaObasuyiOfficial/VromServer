import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";
import User from "../database/databaseModel/user.js";
import {
  menuMessage,
  menuMessage2,
  helpMessage,
} from "../utilities/menuMessage.js";

export const userRequest = async (req: Request, res: Response) => {
  try {
    const whatsappMessage = req.body.Body?.trim().toLowerCase();
    const recipientPhone = (req.body.From as string).replace("whatsapp:", "");
    let userDetails = await User.findOne({ phone: recipientPhone });
    if (!userDetails) {
      const addUser = await User.create({
        phone: recipientPhone,
        state: "menu",
        status: "customer",
        processingState: "1",
      });
      if (!addUser) {
        res.status(500).send("Failed to add new user");
      }
    }

    if (whatsappMessage === "1" && userDetails) {
      await sendMessage(
        recipientPhone,
        "THANK YOU for considering registering as a *Vrom Rider*.\n\nYour registration process will begin shortly."
      );
      userDetails!.state = "registeringAsARider";
      userDetails!.processingState = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(
        recipientPhone,
        "Please REPLY with your *first name*.\n\nPlease note:\nTo cancel❌ this process REPLY with *409*"
      );
    } else if (whatsappMessage === "2" && userDetails) {
      await sendMessage(recipientPhone, "Please REPLY with your *current location*\n\n e.g., 3, Wisdom Lake, Off...\n\nPlease note:\nTo CANCEL❌ this process REPLY with *409*");
    } else if (whatsappMessage === "3" && userDetails) {
      await sendMessage(recipientPhone, helpMessage);
    } else if (whatsappMessage === "409" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.processingState = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);
      await sendMessage(recipientPhone, menuMessage2);
    } else {
      if (!userDetails) {
        await sendMessage(recipientPhone, menuMessage);
        await sendMessage(recipientPhone, menuMessage2);
        res.status(200).send("New user added");
      } else {
        if (userDetails!.state === "menu") {
          await sendMessage(recipientPhone, menuMessage);
          await sendMessage(recipientPhone, menuMessage2);
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "1"
        ) {
          const registerName = whatsappMessage;
          const nameRegex = /^[A-Za-z]{2,}$/;

          if (!nameRegex.test(registerName) || !registerName) {
            await sendMessage(
              recipientPhone,
              "Please ENTER a *valid name* (letters only, at least 2 characters).\n\nPlease note:\nTo CANCEL❌ this process REPLY with *409*"
            );
            res.status(400).send("Invalid Name");
          } else {
            await User.findOneAndUpdate(
              { phone: recipientPhone },
              { processingState: "2" }
            );
            userDetails!.name = registerName.toUpperCase();
            userDetails!.processingState = "2";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            await sendMessage(
              recipientPhone,
              `THANK YOU, Please ENTER your *license plate number*.\n\nPlease note:\nTo *CANCEL*❌ this process REPLY with *409*`
            );
          }
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "2"
        ) {
          const licenseNo = whatsappMessage;
          const licenseNoRegex = /^[A-Za-z0-9]+$/;

          if (!licenseNo || !licenseNoRegex.test(licenseNo)) {
            await sendMessage(
              recipientPhone,
              "Please ENTER a *valid license number*.\n\nPlease note:\nTo *CANCEL*❌ this process REPLY with *EXIT*"
            );
          } else {
            await sendMessage(
              recipientPhone,
              `✅THANK YOU *${userDetails!.name.toUpperCase()}* for registering as a *Vrom Rider*.\n\nYou will get a notification once your registration is successful.`
            );
            userDetails!.state = "menu";
            userDetails!.processingState = "1";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }
          }
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Cannot make request.",
    });
    console.error(error);
  }
};
