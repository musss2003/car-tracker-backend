import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectToDb } from './config/dbConfig';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import endPoints from 'express-list-endpoints';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';


dotenv.config();


// CORS configuration
const corsOptions: cors.CorsOptions = {
    origin: process.env.BASE_URL,  // Specify the exact origin
    credentials: true,  // Required for cookies, authorization headers with HTTPS
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
    methods: ['GET', 'POST', 'PUT', 'DELETE']
};

const app: Application = express();

app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());

// Connect to database
connectToDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Home route
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the Home Page!');
});

// List all routes
app.get('/routes', (req: Request, res: Response) => {
    res.status(200).send(endPoints(app));
});

// Set up port and listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
