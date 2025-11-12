import mongoose, { Document, Schema } from "mongoose";

export interface IRideRequest extends Document {
  userPhone: string;
  destination: string;
  status: "pending" | "accepted" | "completed" | "cancelled";
  acceptedBy: string | null;
  createdAt: Date;
}

const RideRequestSchema = new Schema<IRideRequest>({
  userPhone: { type: String, required: true },
  destination: { type: String, required: true },
  status: { type: String, default: "pending" },
  acceptedBy: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IRideRequest>("RideRequest", RideRequestSchema);
