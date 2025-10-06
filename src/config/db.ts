import mongoose from "mongoose";
import { Pool } from "pg";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Car } from "../models/Car";
import { Contract } from "../models/Contract";
import { Notification } from "../models/Notification";
import { Country } from "../models/Country";

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
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// Don't auto-connect the pool here, let TypeORM handle it

// TypeORM DataSource configuration
export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  entities: [User, Customer, Car, Contract, Notification, Country],
  synchronize: process.env.NODE_ENV !== "production", // Only in development
  logging: process.env.NODE_ENV === "development",
  extra: {
    // Connection pool settings for better stability
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 60000,
    // For Neon specifically
    statement_timeout: 60000,
    query_timeout: 60000,
  },
});

// Initialize TypeORM connection with retry logic
export const initializeTypeORM = async (): Promise<void> => {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        console.log("✅ TypeORM connected to PostgreSQL");
        
        // Test the connection
        await AppDataSource.query('SELECT 1');
        console.log("✅ Database connection verified");
        break;
      }
    } catch (error) {
      retries++;
      console.error(`❌ TypeORM connection error (attempt ${retries}/${maxRetries}):`, error);
      
      if (retries >= maxRetries) {
        console.error("❌ Failed to connect to database after maximum retries");
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000 * retries));
    }
  }
};