import mongoose, { Document, Schema } from 'mongoose';

// Define the IExpense interface
interface IExpense extends Document {
    car_id: mongoose.Types.ObjectId; // Reference to the Car model
    description: string;
    amount: number;
    date: Date;
    category: string;
}

// Create the expense schema
const expenseSchema: Schema<IExpense> = new Schema({
    car_id: {
        type: Schema.Types.ObjectId,
        ref: 'Car', // Reference to the Car model
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
});

// Create the Expense model
const Expense = mongoose.model<IExpense>('Expense', expenseSchema); // Model name 'Expense' as a string
export default Expense; // Export the Expense model
