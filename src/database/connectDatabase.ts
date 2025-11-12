import mongoose from "mongoose";

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ Vrom Database is connected");
  } catch (error) {
    console.error("❌ Vrom Database connection error:", error);
    process.exit(1);
  }
};
