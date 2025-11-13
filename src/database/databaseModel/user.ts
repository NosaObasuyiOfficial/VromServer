import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  phone: string;
  state: 'menu' | 'registeringAsARider' | 'RequestingARide';
  status: 'rider' | 'customer';
  processingState: string
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: false },
  phone: { type: String, required: false, unique: true },
  state: { type: String, required: false },
  status: { type: String, required: false },
  processingState: { type: String, required: false }
});

export default mongoose.model<IUser>("User", UserSchema);
