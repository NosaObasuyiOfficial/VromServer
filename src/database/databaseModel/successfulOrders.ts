import mongoose, { Document, Schema } from "mongoose";

export interface ISuccessfulOrder extends Document {
  userPhone: string;
  location: string;
  destination: string;
  riderPhone: string;
  createdAt: Date
}

const SuccessfulOrderSchema = new Schema<ISuccessfulOrder>({
  userPhone: { type: String, required: false },
  location: { type: String, required: false },
  destination: { type: String, required: false },
  riderPhone: { type: String, required: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISuccessfulOrder>("SuccessfulOrder", SuccessfulOrderSchema);
