import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  phone: string;
  state: 'menu' | 'registeringAsARider' | 'RequestingARide';
  status: 'rider' | 'customer';
  processingState: string
}

const UserSchema = new Schema<IUser>({
  phone: { type: String, required: false, unique: true },
  state: { type: String, required: false },
  status: { type: String, required: false },
  processingState: { type: String, required: false }
});

export default mongoose.model<IUser>("User", UserSchema);
