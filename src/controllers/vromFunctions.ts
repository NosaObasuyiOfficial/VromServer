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

    if (whatsappMessage === "1") {
      await sendMessage(
        recipientPhone,
        "Thank you for considering registering as a Vrom rider. Your registration process will begin shortly."
      );
      userDetails!.state = "registeringAsARider";
      userDetails!.processingState = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(
        recipientPhone,
        "Please reply with your name.\n\nPlease note:\nTo cancel❌ this process reply with *EXIT*"
      );
    } else if (whatsappMessage === "2") {
      await sendMessage(recipientPhone, "🚗 You're registered as a Driver!");
    } else if (whatsappMessage === "3") {
      await sendMessage(recipientPhone, helpMessage);
    } else if (whatsappMessage === "exit") {
      userDetails!.state = "menu";
      userDetails!.processingState = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);
      await sendMessage(recipientPhone, menuMessage2);
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

        if (!nameRegex.test(registerName)) {
          await sendMessage(
            recipientPhone,
            "Please enter with your name (letters only, at least 2 characters).\n\nPlease note:\nTo cancel❌ this process reply with *EXIT*"
          );
          res.status(400).send("Invalid Name")
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
            `Thank you, Please enter your license plate number.\n\nPlease note:\nTo cancel❌ this process reply with *EXIT`
          );
        }
      } else if (
        userDetails!.state === "registeringAsARider" &&
        userDetails!.processingState === "2"
      ) {
       const licenseNo = whatsappMessage;

        if (!licenseNo) {
          await sendMessage(
            recipientPhone,
            "Please enter a valid license number.\n\nPlease note:\nTo cancel❌ this process reply with *EXIT*"
          );
        } else {
          // await User.findOneAndUpdate(
          //   { phone: recipientPhone },
          //   { processingState: "2" }
          // );
          // userDetails!.name = registerName.toUpperCase();
          // userDetails!.processingState = "2";
          // const saveDetails = await userDetails!.save();
          // if (!saveDetails) {
          //   res.status(500).send("Failed to save user details");
          // }

          await sendMessage(
            recipientPhone,
            `✅Thank you ${userDetails!.name.toUpperCase()} for registering as a Vrom rider. You will get a notification once your registration is successful.`
          );
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Cannot work",
    });
    console.error(error);
  }
};
