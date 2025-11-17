import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";
import User from "../database/databaseModel/user.js";
import riderRequest from "../database/databaseModel/riderRequest.js";
import {
  menuMessage,
  helpMessage,
  licensePromptMessage,
  namePromptMessage,
  firstNamePromptMessage,
  licensePlatePromptMessage,
} from "../utilities/menuMessage.js";
import {
  generateUniqueACCode,
  formatDate,
} from "../utilities/helperFunctions.js";
import dotenv from "dotenv";

dotenv.config();
const {
  ADMIN_WHATSAPP_NUMBER1,
  ADMIN_WHATSAPP_NUMBER2,
  ADMIN_WHATSAPP_NUMBER3,
} = process.env;

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
      if (
        userDetails!.state === "menu" &&
        userDetails!.processingState === "3"
      ) {
        await sendMessage(
          recipientPhone,
          `*REGISTRATION IN PROGRESS*\n\n📩 You’ll receive a notification once your registration has been successfully approved.`
        );
        res.status(200).send("Request successful!");
      } else if (
        userDetails!.state === "menu" &&
        userDetails!.status === "rider" &&
        userDetails!.processingState === "4"
      ) {
        await sendMessage(
          recipientPhone,
          `*CONGRATULATIONS! You have been registered as a *Vrom Rider🏍️.\n\nSAFETY FIRST ALWAYS!!!*.`
        );
        res.status(200).send("Request successful!");
      } else {
        await sendMessage(
          recipientPhone,
          "🙏THANK YOU for considering registering as a *Vrom Rider*.\n\nYour registration process will begin shortly."
        );
        userDetails!.state = "registeringAsARider";
        userDetails!.processingState = "1";
        const saveDetails = await userDetails!.save();
        if (!saveDetails) {
          res.status(500).send("Failed to save user details");
        }
        await sendMessage(recipientPhone, firstNamePromptMessage);

        const addRiderRequest = await riderRequest.create({
          phone: recipientPhone,
        });
        if (!addRiderRequest) {
          res.status(500).send("Failed to add new user");
        }

        res.status(200).send("Request successful!");
      }
    } else if (whatsappMessage === "2" && userDetails) {
      await sendMessage(
        recipientPhone,
        "Please REPLY with your *current location*\n\n e.g., 3, Wisdom Lake, Off...\n\nPlease note:\nTo CANCEL❌ this process REPLY with *409*"
      );
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

      await riderRequest.findOneAndDelete({ phone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (
      `${whatsappMessage.split("")[0]}${whatsappMessage.split("")[1]}` ===
        "VR" &&
      userDetails
    ) {
      if (
        recipientPhone === ADMIN_WHATSAPP_NUMBER1! ||
        recipientPhone === ADMIN_WHATSAPP_NUMBER2! ||
        recipientPhone === ADMIN_WHATSAPP_NUMBER3!
      ) {
        let riderDetails = await riderRequest.findOne({
          code: whatsappMessage,
        });
        if (!riderDetails) {
          await sendMessage(recipientPhone, `*Incorrect Code*.`);
          res.status(500).send("Failed to find rider details");
        }

        if (riderDetails!.code === whatsappMessage) {
          await sendMessage(
            riderDetails!.phone,
            `*CONGRATULATIONS! You have been registered as a *Vrom Rider🏍️.\n\nSAFETY FIRST ALWAYS!!!*.`
          );

          userDetails!.status = "rider";
          userDetails!.processingState = "4";
          const saveDetails = await userDetails!.save();
          if (!saveDetails) {
            res.status(500).send("Failed to save user details");
          }

          await riderRequest.findOneAndDelete({ phone: riderDetails!.phone });
          res.status(200).send("Request successful!");
        } else {
          await sendMessage(recipientPhone, `*Incorrect Code*.`);
          res.status(400).send("Wrong code");
        }
      } else {
        await sendMessage(
          recipientPhone,
          `*SORRY! You are not authorized to make this request*.`
        );
        res.status(401).send("Request successful!");
      }
    } else {
      if (!userDetails) {
        await sendMessage(recipientPhone, menuMessage);
        res.status(200).send("New user added");
      } else {
        if (userDetails!.state === "menu") {
          await sendMessage(recipientPhone, menuMessage);
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "1"
        ) {
          const registerName = whatsappMessage;
          const nameRegex = /^[A-Za-z]{2,}$/;

          if (!nameRegex.test(registerName) || !registerName) {
            await sendMessage(recipientPhone, namePromptMessage);
            res.status(400).send("Invalid Name");
          } else {
            await User.findOneAndUpdate(
              { phone: recipientPhone },
              { processingState: "2" }
            );

            await sendMessage(recipientPhone, licensePlatePromptMessage);

            await riderRequest.findOneAndUpdate(
              { phone: recipientPhone },
              { name: registerName.toUpperCase() }
            );

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "registeringAsARider" &&
          userDetails!.processingState === "2"
        ) {
          const licenseNo = whatsappMessage;
          const licenseNoRegex = /^[A-Za-z0-9]+$/;

          if (
            !licenseNo ||
            (!licenseNoRegex.test(licenseNo) && licenseNo.length < 4)
          ) {
            await sendMessage(recipientPhone, licensePromptMessage);
          } else {
            await sendMessage(
              recipientPhone,
              `✅ *Thank you, for registering as a *Vrom Rider* 🏍️.\n\n` +
                `📩 You’ll receive a notification once your registration has been successfully approved.`
            );
            userDetails!.state = "menu";
            userDetails!.processingState = "3";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            const code = generateUniqueACCode();
            const registeredAt = formatDate();

            await riderRequest.findOneAndUpdate(
              { phone: recipientPhone },
              { licenseNo: licenseNo, registeredAt, code }
            );

            //Write the code here to send the reqests to admin and also to send the details of the request

            res.status(200).send("Request successful!");
          }
        }
      }
    }
  } catch (error) {
    res.status(500).json({
      message: "Server error. Cannot make request.",
    });
    console.error(error);
  }
};
