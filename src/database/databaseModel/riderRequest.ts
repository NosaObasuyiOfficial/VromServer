import mongoose, { Document, Schema } from "mongoose";

export interface IRiderRequest extends Document {
  name: string;
  phone: string;
  licenseNo: string;
  code: string;
  registeredAt: string;
}

const RiderRequestSchema = new Schema<IRiderRequest>({
  name: { type: String, required: false },
  phone: { type: String, required: false, unique: false },  
  licenseNo: { type: String, required: false },
  code: { type: String, required: false },
  registeredAt: { type: String, required: false },
});


export default mongoose.model<IRiderRequest>("RiderRequest", RiderRequestSchema);
