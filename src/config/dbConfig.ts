import mongoose from "mongoose";

export const connectToDb = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI || "", {
      serverSelectionTimeoutMS: 5000, // Set the timeout for server selection
      socketTimeoutMS: 45000, // Set the socket timeout
    });

    console.log("Connected to database");
  } catch (e) {
    console.error("Error connecting to database:", e);
  }
}
