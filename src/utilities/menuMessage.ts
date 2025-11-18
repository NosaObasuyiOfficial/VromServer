export const menuMessage =
  "👋 *Hey there! Welcome to Vrom* 🚖\n\n" +
  "Please choose what you'd like to do:\n\n" +
  "1️⃣ *Register as a Rider* 🏍️\n" +
  "2️⃣ *Request a Ride* 🚕\n" +
  "3️⃣ *Help / Support* 💬\n\n" +
  "Reply with the number (*1*, *2*, or *3*) to continue. 😊";

export const helpMessage =
  "💭 *Do you have any concerns or issues?* \n" +
  "Please send your problem to +234820928728, and our team will assist you as soon as possible. 🙌\n\n" +
  "🔁 To DELETE your *rider* account, simply reply with *DEL412* 📝";

export const licensePromptMessage =
  "🚘 *Please enter a valid license plate number.*\n\n" +
  "⚠️ Make sure it contains only letters and numbers (no special characters).\n\n" +
  "❌ To *cancel* this process, reply with *409*.";

export const namePromptMessage =
  "👤 *Please enter a valid name* — letters only, at least 2 characters.\n\n" +
  "⚠️ To *cancel* this process, reply with *409* ❌";

export const firstNamePromptMessage =
  "🪪 *Please reply with your first name.*\n\n" +
  "⚠️ To *cancel* this process, reply with *409* ❌";

export const licensePlatePromptMessage =
  "🙏 *Thank you!* Please enter your *bike license plate number*.\n\n" +
  "⚠️ To *cancel* this process, reply with *409* ❌";

export function riderRegisterationAlert(
  name: string,
  phone: string,
  licenseNo: string,
  registrationDate: string,
  code: string
) {
  return `*New Rider Registration Request*🚖\n\nName: ${name}\nPhone: ${phone}\nLicense No: ${licenseNo}\Requested At: ${registrationDate}\n\n✔️ To accept, send ${code}`;
}

export const locationPromptMessage =
  "👤 *Please enter a valid location*.\n\n" +
  "⚠️ To *cancel* this process, reply with *439* ❌";

export function rideNotification(
  location: string,
  destination: string,
  phoneNumber: string,
  code: string
) {
  return `*NEW RIDE ALERT*🚖\n\nLocation: *${location}*\nDestination: *${destination}*\nPhone Number: ${phoneNumber}\n\n✔️ To accept this ride, send ${code}`;
}

export function userRideNotification(
  name: string,
  phone: string
) {
  return `*YOUR RIDE HAS BEEN ACCEPTED*🚖\n\n*Rider details*\nName: *${name}*\nPhone Number: ${phone}\n\nHave a SAFE RIDE!!\n\n⚠️ To *CANCEL* this ride, reply with *447* ❌`;
}
