import mongoose from 'mongoose';

export const connectToDb = async (): Promise<void> => {
    try {
      await mongoose.connect(process.env.DB_URI || '');
      console.log('connected');
    } catch (e) {
      console.error('Error connecting to database:', e);
    }
  };
  