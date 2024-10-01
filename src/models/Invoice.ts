import mongoose, { Document, Schema } from 'mongoose';

// Define the IInvoice interface
interface IInvoice extends Document {
    rental_id: mongoose.Types.ObjectId; // Reference to the Rental model
    amount: number;
    issue_date: Date;
    due_date: Date;
    status: 'unpaid' | 'paid' | 'overdue'; // Enum type for status
}

// Create the invoice schema
const invoiceSchema: Schema<IInvoice> = new Schema({
    rental_id: {
        type: Schema.Types.ObjectId,
        ref: 'Rental', // Reference to the Rental model
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    issue_date: {
        type: Date,
        required: true,
    },
    due_date: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid', 'overdue'],
        default: 'unpaid',
    },
});

// Create the Invoice model
const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema); // Model name 'Invoice' as a string
export default Invoice; // Export the Invoice model
