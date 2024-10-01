import mongoose, { Document, Schema } from 'mongoose';

// Define the IRental interface
interface IRental extends Document {
    user_id: mongoose.Types.ObjectId; // Reference to the User model
    car_id: mongoose.Types.ObjectId; // Reference to the Car model
    rental_start_date: Date;
    rental_end_date: Date;
    total_price: number;
    status: 'booked' | 'active' | 'completed' | 'canceled'; // Enum type for rental status
}

// Create the rental schema
const rentalSchema: Schema<IRental> = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
    car_id: {
        type: Schema.Types.ObjectId,
        ref: 'Car', // Reference to the Car model
        required: true,
    },
    rental_start_date: {
        type: Date,
        required: true,
    },
    rental_end_date: {
        type: Date,
        required: true,
    },
    total_price: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['booked', 'active', 'completed', 'canceled'], // Enum values for rental status
        default: 'booked',
    },
});

// Create the Rental model
const Rental = mongoose.model<IRental>('Rental', rentalSchema); // Model name 'Rental' as a string
export default Rental; // Export the Rental model
