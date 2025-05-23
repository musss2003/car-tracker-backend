import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

enum UserRole {
    ADMIN = "admin",
    EMPLOYEE = "employee",
    USER = "user", // Add other roles if needed
}

// Define the IUser interface
export interface IUser extends Document {
    _id: string;
    name?: string;
    username: string;
    email: string;
    citizenshipId?: string;
    profilePhotoUrl?: string;
    password: string;
    role: UserRole; // Enum type for user role
    lastLogin?: Date;

    // Method to generate an access token
    generateAccessToken: () => string;
}

// Create the user schema
const userSchema: Schema<IUser> = new Schema({
    name: {
        type: String,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    citizenshipId: {
        type: String,
    },
    profilePhotoUrl: {
        type: String,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(UserRole), // ⬅️ Allow only "admin", "employee", "user"
        default: UserRole.USER,
    },
    lastLogin: {
        type: Date,
    },
});

// Pre-save middleware for hashing the password
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to generate an access token
userSchema.methods.generateAccessToken = function (): string {
    return jwt.sign(
        { id: this._id },
        process.env.ACCESS_TOKEN_SECRET || '', // Ensure you handle missing secret
        { expiresIn: process.env.ACCESS_TOKEN_DURATION + 'ms' }
    );
};

// Create and export the User model
const User = mongoose.model<IUser>('User', userSchema);

export default User;
