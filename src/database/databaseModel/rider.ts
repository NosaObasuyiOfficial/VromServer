import mongoose, { Document, Schema } from "mongoose";

export interface IRider extends Document {
  name: string;
  phone: string;
  status: "available" | "busy";
  licenseNo: string;
  registeredAt: Date;
}

const RiderSchema = new Schema<IRider>({
  name: { type: String, required: false },
  licenseNo: { type: String, required: false },
  phone: { type: String, required: false, unique: true },
  status: { type: String, default: "available" },
  registeredAt: { type: Date, default: Date.now }
});

export default mongoose.model<IRider>("Rider", RiderSchema);
