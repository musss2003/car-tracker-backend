import mongoose, { Schema, Document } from 'mongoose';

export interface MaintenanceRecord extends Document {
    carLicensePlate: string;
    type: MaintenanceType;
    date: Date;
    mileage: number;
    description: string;
    nextDueMileage: number | null;
    createdAt: Date;
    cost?: number;
    performedBy?: string;
    invoiceNumber?: string;
}

const MaintenanceRecordSchema: Schema = new Schema(
    {
        carLicensePlate: { type: String, required: true },
        type: { type: String, required: true },
        date: { type: Date, required: true },
        mileage: { type: Number, required: true },
        description: { type: String, required: true },
        nextDueDate: { type: Date, default: null },
        nextDueMileage: { type: Number, default: null },
        createdAt: { type: Date, default: Date.now },
        cost: { type: Number },
        performedBy: { type: String },
        invoiceNumber: { type: String },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<MaintenanceRecord>('MaintenanceRecord', MaintenanceRecordSchema);

export type MaintenanceType =
  | "Oil Change"
  | "Tire Rotation"
  | "Brake Service"
  | "Air Filter"
  | "Battery Replacement"
  | "Inspection"
  | "Fluid Check"
  | "Transmission Service"
  | "Coolant Flush"
  | "Spark Plugs"
  | "Timing Belt"
  | "Other"
