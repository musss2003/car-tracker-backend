import mongoose, { Document, Schema } from 'mongoose';

// Define the IPayment interface
interface IPayment extends Document {
    rental_id: mongoose.Types.ObjectId; // Reference to the Rental model
    amount: number;
    payment_date: Date;
    payment_method: 'credit card' | 'PayPal'; // Enum type for payment method
    status: 'pending' | 'completed' | 'failed'; // Enum type for status
}

// Create the payment schema
const paymentSchema: Schema<IPayment> = new Schema({
    rental_id: {
        type: Schema.Types.ObjectId,
        ref: 'Rental', // Reference to the Rental model
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    payment_date: {
        type: Date,
        required: true,
    },
    payment_method: {
        type: String,
        enum: ['credit card', 'PayPal'], // Enum values for payment method
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'], // Enum values for payment status
        default: 'pending',
    },
});

// Create the Payment model
const Payment = mongoose.model<IPayment>('Payment', paymentSchema); // Model name 'Payment' as a string
export default Payment; // Export the Payment model
