import mongoose, { Document, Schema } from "mongoose";

export interface IRiderRequest extends Document {
  name: string;
  phone: string;
  licenseNo: string;
  code: string;
  registeredAt: Date;
}

const RiderRequestSchema = new Schema<IRiderRequest>({
  name: { type: String, required: false },
  phone: { type: String, required: false, unique: false },  
  licenseNo: { type: String, required: false },
  registeredAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRiderRequest>("RiderRequest", RiderRequestSchema);
