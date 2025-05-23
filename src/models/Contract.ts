import mongoose, { Schema, Document } from 'mongoose';

export interface IContract extends Document {
    _id: mongoose.Types.ObjectId;
    customer: {
        id: mongoose.Types.ObjectId;
        name: string;
        passport_number: string;
        driver_license_number: string;
        address?: string;
    };
    car: {
        id: mongoose.Types.ObjectId;
        manufacturer: string;
        model: string;
        license_plate: string;
        price_per_day: number
    };
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
    customer: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
        name: { type: String, required: true },
        passport_number: { type: String, required: true },
        driver_license_number: { type: String, required: true },
        address: { type: String, required: false }
    },
    car: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
        manufacturer: { type: String, required: true },
        model: { type: String, required: true },
        license_plate: { type: String, required: true }
    },
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