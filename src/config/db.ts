import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;
import { DataSource } from "typeorm";
import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Car } from "../models/Car";
import { Contract } from "../models/Contract";
import { Notification } from "../models/Notification";
import { Country } from "../models/Country";
import { RefreshToken } from "../models/RefreshToken";
import { AuditLog } from "../models/Auditlog";
import CarRegistration from "../models/CarRegistration";
import CarInsurance from "../models/CarInsurance";
import CarServiceHistory from "../models/CarServiceHistory";
import CarIssueReport from "../models/CarIssueReport";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // needed for RDS SSL in some setups
  },
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// TypeORM DataSource configuration
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [User, Customer, Car, CarRegistration, CarInsurance, CarServiceHistory, CarIssueReport, Contract, Notification, Country, RefreshToken, AuditLog],
  synchronize: process.env.NODE_ENV !== "production", // Only in development
  logging: process.env.NODE_ENV === "development",
  extra: {
    // Connection pool settings for better stability
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased timeout
    acquireTimeoutMillis: 60000,
    statement_timeout: 60000,
    query_timeout: 60000,
  },
  connectTimeoutMS: 10000, // Add connection timeout at root level
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

export default pool;