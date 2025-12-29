import mongoose, { Document, Schema } from "mongoose";

export interface ISubscription extends Document {
    userId: string;
    plan: 'free' | 'basic' | 'premium';
    status: 'active' | 'inactive' | 'cancelled';
    startDate: Date;
    endDate: Date;
    price: number;
    subscriptionCode:string
}

const SubscriptionSchema = new Schema<ISubscription>({
    userId: { type: String, required: true, unique: true},
    plan: { type: String, required: true },
    status: { type: String, required: true, default: "active" },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true },
    subscriptionCode: { type: String, default: "" }
});

export default mongoose.model<ISubscription>("Subscription", SubscriptionSchema);
