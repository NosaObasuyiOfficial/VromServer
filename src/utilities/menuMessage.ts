import type { StringExpression } from "mongoose";

export const menuMessage =
  "👋 *Hey there! Welcome to VROOM©️ *\n\n" +
  "Please choose what you'd like to do:\n\n" +
  "1️⃣ *Register as a Rider* 👤\n" +
  "2️⃣ *Request a Ride* 🏍️\n" +
  "3️⃣ *Subscriptions* ⭐\n" +
  "4️⃣ *Help / Support* 💬\n\n" +
  "Reply with the number (*1*, *2*, *3*, or *4*) to continue. 😊";

export const helpMessage =
  "💭 *Do you have any concerns or issues?* \n" +
  "Please send your problem to +2349078129972, and our team will assist you as soon as possible. 🙌\n\n" +
  "🔁 To DELETE your *rider* profile, simply reply with *319* 📝";

export const licensePromptMessage =
  "🚘 *Please enter a valid license plate number.*\n\n" +
  "⚠️ Make sure it contains only letters and numbers (no special characters).\n\n" +
  "❌ To *cancel* this process, reply with *0*.";

export const namePromptMessage =
  "👤 *Please enter a valid name* — letters only, at least 2 characters.\n\n" +
  "⚠️ To *cancel* this process, reply with *0*";

export const firstNamePromptMessage =
  "Your registration process has begun.\n\n" +
  "🪪 *Please reply with your first name.*\n\n" +
  "⚠️ To *cancel* this process, reply with *0*";

export const licensePlatePromptMessage =
  "🙏 *Thank you!* Please enter your *bike license plate number*.\n\n" +
  "⚠️ To *cancel* this process, reply with *0*";

export function riderRegisterationAlert(
  name: string,
  phone: string,
  licenseNo: string,
  registrationDate: string,
  code: string
) {
  return `*New Rider Registration Request* 🏍\n\nName: *${name}*\nPhone: ${phone}\nLicense No: *${licenseNo}*\nDate: ${registrationDate}\n\n✔️ To accept, send *${code}*`;
}

export const locationPromptMessage =
  "❌ *Please enter a valid location*.\n\n" +
  "⚠️ To *cancel* this process, reply with *9*";

export const destinationPromptMessage =
  "❌ *Please enter a valid destination*.\n\n" +
  "⚠️ To *cancel* this process, reply with *9*";

export const locationMessage =
  "*Please reply with your current location.*\n📍 Example: Wisdom Lake, Off…\n\nIf you wish to cancel this process, reply with *9*";

export const destinationMessage =
  "*Please reply with your destination.*\n📍 Example: Wisdom Lake, Off…\n\nIf you wish to cancel this process, reply with *9*";

export function rideNotification(
  location: string,
  destination: string,
  phoneNumber: string,
  code: string
) {
  return `*NEW RIDE ALERT* 🏍\n\nLocation: *${location}*\nDestination: *${destination}*\nPhone: ${phoneNumber}\n\n✔️ To accept this ride, send *${code}*`;
}

export function userRideNotification(
  name: string,
  phone: string,
  licenseNo: string
) {
  return `*YOUR RIDE HAS BEEN ACCEPTED* 🏍\n\n***Rider Details***\n👤 Name: *${name}*\n🔢 License No.: *${licenseNo}*\n\n💬 *Message your rider directly:*\nhttps://wa.me/${phone}?text=Hello%20I%20am%20your%20VROOM%20ride%20request\n\nHave a SAFE RIDE! 🛵\n\n⚠️ To return back to *MENU*, reply with *7*`;
}

export function riderRideNotification(
  location: string,
  destination: string,
  phone: string
) {
  return (
    "*YOU HAVE ACCEPTED A RIDE* 🏍\n\n" +
    "***Ride Details***\n" +
    `📍 Pick-up: *${location}*\n` +
    `🏁 Destination: *${destination}*\n\n` +
    "💬 *Message the passenger directly:*\n" +
    `https://wa.me/${phone}?text=Hello%20I%20am%20your%20VROOM%20rider%20on%20the%20way \n\n` +
    "Please DRIVE SAFELY! 🛵"
  );
}
