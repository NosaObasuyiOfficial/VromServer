import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  lastRequest?: mongoose.Types.ObjectId | null;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  lastRequest: { type: Schema.Types.ObjectId, ref: "RideRequest", default: null },
});

export default mongoose.model<IUser>("User", UserSchema);
