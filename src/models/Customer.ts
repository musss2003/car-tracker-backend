import mongoose, { Document, Schema } from 'mongoose';

// Define the Customer interface
interface ICustomer extends Document {
    name: string;
    email?: string; // Optional
    phone_number?: string; // Optional
    address?: string; // Optional
    driver_license_number: string;
    passport_number: string;
}

// Create the customer schema
const customerSchema: Schema<ICustomer> = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
    },
    phone_number: {
        type: String,
    },
    address: {
        type: String,
    },
    driver_license_number: {
        type: String,
        required: true,
    },
    passport_number: {
        type: String,
        required: true,
    },
});

// Export the Customer model
const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
export default Customer;
