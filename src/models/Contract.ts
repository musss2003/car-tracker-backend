import mongoose, { Schema, Document } from 'mongoose';

export interface IContract extends Document {
    customer: mongoose.Types.ObjectId;
    car: mongoose.Types.ObjectId;
    rentalPeriod: {
        startDate: Date;
        endDate: Date;
    };
    rentalPrice: {
        dailyRate: number;
        totalAmount: number;
    };
    paymentDetails: {
        paymentMethod: string;
        paymentStatus: 'pending' | 'paid';
    };
    additionalNotes?: string;
    createdAt?: Date;
    updatedAt?: Date;
    contractPhoto?: string;
}

const contractSchema: Schema = new Schema({
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    rentalPeriod: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    rentalPrice: {
        dailyRate: { type: Number, required: true },
        totalAmount: { type: Number, required: true },
    },
    paymentDetails: {
        paymentMethod: { type: String, default: "cash" },
        paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'paid' },
    },
    additionalNotes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    contractPhoto: { type: String }
});

export default mongoose.model<IContract>('Contract', contractSchema);

