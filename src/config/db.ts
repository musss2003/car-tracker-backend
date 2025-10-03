import mongoose from "mongoose";
import { Pool } from "pg";
import dotenv from "dotenv";

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


const createCarsTable = async () => {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS cars (
        id SERIAL PRIMARY KEY,
        manufacturer VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INT NOT NULL,
        color VARCHAR(50),
        license_plate VARCHAR(50) UNIQUE NOT NULL,
        chassis_number VARCHAR(100),
        price_per_day NUMERIC(10,2)
      );
    `;

    await pool.query(query);
    console.log("✅ Cars table created successfully");
  } catch (err) {
    console.error("❌ Error creating cars table:", err);
  }
};

// Call the function
createCarsTable();

