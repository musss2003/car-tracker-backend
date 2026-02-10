import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { DataSource } from 'typeorm';
import { User } from '../models/user.model';
import { Customer } from '../models/customer.model';
import { Car } from '../models/car.model';
import { Contract } from '../models/contract.model';
import { Notification } from '../models/notification.model';
import { Country } from '../models/country.model';
import { RefreshToken } from '../models/refresh-token.model';
import { AuditLog } from '../models/audit-log.model';
import CarRegistration from '../models/car-registration.model';
import CarInsurance from '../models/car-insurance.model';
import CarServiceHistory from '../models/car-service-history.model';
import CarIssueReport from '../models/car-issue-report.model';
import { Booking } from '../models/booking.model';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
});

// TypeORM DataSource configuration
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    User,
    Customer,
    Car,
    CarRegistration,
    CarInsurance,
    CarServiceHistory,
    CarIssueReport,
    Contract,
    Booking,
    Notification,
    Country,
    RefreshToken,
    AuditLog,
  ],
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' || process.env.NODE_ENV !== 'production', // Allow manual override
  logging: process.env.NODE_ENV === 'development',
  extra: {
    // ✅ Optimized Connection pool settings for scalability
    max: parseInt(process.env.DB_POOL_MAX || '100'), // Maximum pool size (increased for high traffic)
    min: parseInt(process.env.DB_POOL_MIN || '20'), // Minimum pool size
    idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
    connectionTimeoutMillis: 5000, // Fail fast if no connection available
    acquireTimeoutMillis: 60000,
    statement_timeout: 30000, // Query timeout: 30 seconds
    query_timeout: 30000,
  },
  poolSize: parseInt(process.env.DB_POOL_SIZE || '50'), // TypeORM pool size
  connectTimeoutMS: 10000, // Add connection timeout at root level
});

// Initialize TypeORM connection with retry logic
export const initializeTypeORM = async (): Promise<void> => {
  const maxRetries = 3;
  let retries = 0;

  console.log('🔗 Attempting to connect to TypeORM...');
  console.log(`📍 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`🔐 SSL: ${process.env.DB_SSL === 'true' ? 'enabled' : 'disabled'}`);

  while (retries < maxRetries) {
    try {
      if (!AppDataSource.isInitialized) {
        console.log(`🔄 Initializing TypeORM (attempt ${retries + 1}/${maxRetries})...`);
        await AppDataSource.initialize();
        console.log('✅ TypeORM connected to PostgreSQL');

        // Test the connection
        await AppDataSource.query('SELECT 1');
        console.log('✅ Database connection verified');
        break;
      }
    } catch (error) {
      retries++;
      console.error(`❌ TypeORM connection error (attempt ${retries}/${maxRetries}):`, error);

      if (retries >= maxRetries) {
        console.error('❌ Failed to connect to database after maximum retries');
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
    }
  }
};

export default pool;
