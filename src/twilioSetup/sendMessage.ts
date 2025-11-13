import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

export const sendMessage = async (to: string, body: string): Promise<void> => {
  try {
   const msg = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER!,
      to: `whatsapp:${to}`,
      body,
    });
        console.log("Twilio Response:", msg);
  } catch (error) {
    console.error("Sorry! Failed to send message:", error);
  }
};
