import mongoose from "mongoose";
import { Pool } from "pg";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Car } from "../models/Car";
import { Contract } from "../models/Contract";
import { Notification } from "../models/Notification";

dotenv.config();

export const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.DB_URI || "", {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
  }
};

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(() => console.log("✅ Connected to Neon PostgreSQL"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

// TypeORM DataSource configuration
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [User, Customer, Car, Contract, Notification],
  synchronize: process.env.NODE_ENV !== "production", // Only in development
  logging: process.env.NODE_ENV === "development",
});

// Initialize TypeORM connection
export const initializeTypeORM = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("✅ TypeORM connected to PostgreSQL");
  } catch (error) {
    console.error("❌ TypeORM connection error:", error);
  }
};