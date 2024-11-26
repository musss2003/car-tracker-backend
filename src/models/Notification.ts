import mongoose, { Document, Schema } from 'mongoose';

// Define the Notification interface extending Mongoose Document
export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId; // ID of the user receiving the notification
    sender?: mongoose.Types.ObjectId;   // Optional: ID of the user sending the notification
    type: string;                       // Type of notification (e.g., "message", "alert")
    message: string;                    // Notification content
    status: "new" | "seen";             // Status of the notification
    createdAt: Date;                    // Timestamp of creation
}

// Define the schema for the Notification model
const NotificationSchema: Schema<INotification> = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User', // Assuming a User model exists
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Optional field referencing a User model
    },
    type: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["new", "seen"], // Define valid status values
        default: "new",       // Default status is "new"
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically set the current date
    },
});

// Create the Notification model
const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
