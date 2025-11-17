import mongoose, { Document, Schema } from "mongoose";

export interface IRider extends Document {
  name: string;
  phone: string;
  status: "available" | "busy";
  licenseNo: string;
  registeredAt: Date;
}

const RiderSchema = new Schema<IRider>({
  name: { type: String, required: true },
  licenseNo: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  status: { type: String, default: "available" },
  registeredAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRider>("Rider", RiderSchema);
