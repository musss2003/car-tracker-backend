import mongoose, { Document, Schema } from 'mongoose';

// Define the Car interface extending Mongoose Document
export interface ICar {
    manufacturer: string;
    model: string;
    year: number;
    color?: string; // Optional field
    license_plate: string;
    chassis_number?: string; // Optional field
    price_per_day?: number; // Optional field
}

// Create the car schema
const carSchema: Schema<ICar> = new Schema({
    manufacturer: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    color: {
        type: String,
    },
    license_plate: {
        type: String,
        required: true,
        unique: true,
    },
    chassis_number: {
        type: String,
    },
    price_per_day: {
        type: Number,
    },
});

// Create the Car model
const Car = mongoose.model<ICar>('Car', carSchema); // Model name 'Car' as a string
export default Car; // Export the Car model
