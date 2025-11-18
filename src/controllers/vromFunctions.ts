import type { Request, Response } from "express";
import { sendMessage } from "../twilioSetup/sendMessage.js";
import User from "../database/databaseModel/user.js";
import riderRequest from "../database/databaseModel/riderRequest.js";
import Rider from "../database/databaseModel/rider.js";
import {
  menuMessage,
  helpMessage,
  licensePromptMessage,
  namePromptMessage,
  firstNamePromptMessage,
  licensePlatePromptMessage,
  riderRegisterationAlert,
  locationPromptMessage,
  rideNotification,
  userRideNotification,
} from "../utilities/menuMessage.js";
import {
  generateUniqueACCode,
  formatDate,
  generateAcceptCode,
} from "../utilities/helperFunctions.js";
import dotenv from "dotenv";
import RideOrder from "../database/databaseModel/rideOrder.js";
import SuccessfulOrder from "../database/databaseModel/successfulOrders.js";

dotenv.config();
const {
  ADMIN_WHATSAPP_NUMBER1,
  ADMIN_WHATSAPP_NUMBER2,
  ADMIN_WHATSAPP_NUMBER3,
} = process.env;

const admin = [ADMIN_WHATSAPP_NUMBER1!];

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
      const order = await RideOrder.create({
        userPhone: recipientPhone,
      });
      if (!order) {
        res.status(500).send("Failed to add ride order");
      }
      await sendMessage(
        recipientPhone,
        "*Please reply with your current location.*\n📍 Example: Wisdom Lake, Off…\n\nIf you wish to cancel this process, reply with 439 ❌"
      );

      userDetails!.state = "RequestingARide";
      userDetails!.rideRequest = "1";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }

      res.status(200).send("Request successful!");
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
    } else if (whatsappMessage === "439" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.rideRequest = "";
      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);

      await RideOrder.findOneAndDelete({ userPhone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (whatsappMessage === "447" && userDetails) {
      userDetails!.state = "menu";
      userDetails!.rideRequest = "";

      const saveDetails = await userDetails!.save();
      if (!saveDetails) {
        res.status(500).send("Failed to save user details");
      }
      await sendMessage(recipientPhone, menuMessage);

      await SuccessfulOrder.findOneAndDelete({ userPhone: recipientPhone });
      res.status(200).send("Request successful!");
    } else if (
      `${whatsappMessage.split("")[0]}${whatsappMessage.split("")[1]}` ===
        "vr" &&
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

        if (riderDetails!.code.toLowerCase() === whatsappMessage) {
          await sendMessage(
            riderDetails!.phone,
            `*CONGRATULATIONS! You have been registered as a *Vrom Rider🏍️.\n\nSAFETY FIRST ALWAYS!!!*.`
          );

          await User.findOneAndUpdate(
            { phone: riderDetails!.phone },
            { status: "rider", processingState: "4" }
          );

          const addRider = await Rider.create({
            name: riderDetails!.name,
            phone: riderDetails!.phone,
            licenseNo: riderDetails!.licenseNo,
          });
          if (!addRider) {
            res.status(500).send("Failed to add new rider");
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
    } else if (
      `${whatsappMessage.split("")[0]}${whatsappMessage.split("")[1]}` ===
        "ac" &&
      userDetails
    ) {
      const acceptCode = whatsappMessage;
      let riderDetails = await Rider.findOne({
        phone: recipientPhone,
      });

      if (!riderDetails) {
        await sendMessage(
          riderDetails!.phone,
          `*SORRY! You are not authorized to make this request*.`
        );
        res.status(500).send("Failed to find rider details");
      }

      let rideDets = await RideOrder.findOne({ acceptCode });
      if (!rideDets) {
        await sendMessage(
          riderDetails!.phone,
          `*SORRY! This ride has already been accepted*.`
        );
        res.status(500).send("Failed to find rider details");
      }

      if (acceptCode === rideDets!.acceptCode) {
        sendMessage(
          rideDets!.userPhone,
          userRideNotification(riderDetails!.name, riderDetails!.phone)
        );

        const addOrder = await SuccessfulOrder.create({
          userPhone: rideDets!.userPhone,
          location: rideDets!.location,
          destination: rideDets!.destination,
          riderPhone: riderDetails!.phone,
        });
        if (!addOrder) {
          res.status(500).send("Failed to add successful order");
        }

        await RideOrder.findOneAndDelete({ acceptCode });
        res.status(200).send("Request successful!");
      } else {
        await sendMessage(riderDetails!.phone, `*Invalid acceptance code*.`);
        res.status(500).send("Failed to find rider details");
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

            const code = await generateUniqueACCode();
            const registeredAt = formatDate();

            const riderReq = await riderRequest.findOneAndUpdate(
              { phone: recipientPhone },
              { licenseNo: licenseNo, registeredAt, code }
            );

            await Promise.all(
              admin.map((num) =>
                sendMessage(
                  num,
                  riderRegisterationAlert(
                    riderReq!.name,
                    riderReq!.phone,
                    riderReq!.licenseNo,
                    riderReq!.registeredAt,
                    riderReq!.code.toUpperCase()
                  )
                )
              )
            );

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "1"
        ) {
          const userLocation = whatsappMessage;
          if (userLocation.length < 4) {
            await sendMessage(recipientPhone, locationPromptMessage);
            res.status(400).send("Invalid location");
          } else {
            await RideOrder.findOneAndUpdate(
              { userPhone: recipientPhone },
              { location: userLocation }
            );

            await sendMessage(
              recipientPhone,
              "*Please reply with your destination.*\n📍 Example: Wisdom Lake, Off…\n\nIf you wish to cancel this process, reply with 439 ❌"
            );

            userDetails!.rideRequest = "2";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "2"
        ) {
          const userDestination = whatsappMessage;
          if (userDestination.length < 4) {
            await sendMessage(recipientPhone, locationPromptMessage);
            res.status(400).send("Invalid location");
          } else {
            const acceptCode = await generateAcceptCode();
            const order = await RideOrder.findOneAndUpdate(
              { userPhone: recipientPhone },
              { destination: userDestination, acceptCode }
            );

            await sendMessage(
              recipientPhone,
              "*Thank you for choosing Vrom.*\nPlease wait... while we assign you a rider.\n\nIf you wish to cancel this process, reply with 439 ❌"
            );

            const availablePhones = await Rider.find(
              { status: "available" },
              "phone"
            ).lean();

            const riderPhoneNumbers = availablePhones.map((r) => r.phone);

            await Promise.all(
              riderPhoneNumbers.map((num) =>
                sendMessage(
                  num,
                  rideNotification(
                    order!.location,
                    order!.destination,
                    order!.userPhone,
                    order!.acceptCode.toUpperCase()
                  )
                )
              )
            );

            userDetails!.rideRequest = "3";
            const saveDetails = await userDetails!.save();
            if (!saveDetails) {
              res.status(500).send("Failed to save user details");
            }

            res.status(200).send("Request successful!");
          }
        } else if (
          userDetails!.state === "RequestingARide" &&
          userDetails!.rideRequest === "3"
        ) {
          await sendMessage(
            recipientPhone,
            "*Thank you for choosing Vrom.*\nPlease wait... while we assign you a rider.\n\nIf you wish to cancel this process, reply with 439 ❌"
          );
          res.status(200).send("Request successful!");
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
