import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { connectToDb } from './config/dbConfig';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import contractRoutes from './routes/contractRoutes';
import carRoutes from './routes/carRoutes';
import customerRoutes from './routes/customerRoutes';
import notificationRoutes from './routes/notificationRoutes';
import endPoints from 'express-list-endpoints';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io'; // Using Socket.IO
import Notification from './models/Notification'; // Import the custom Notification model
import multer from "multer";




dotenv.config();

const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: function(req, file, cb){
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: multer.memoryStorage() });


const app: Application = express();
const server = http.createServer(app); // Create the HTTP server
const io = new Server(server); // Attach Socket.IO to the server

app.use(cors({
    origin: [process.env.BASE_URL || "http://default-url.com", "http://localhost:4173"],  // Specify the exact origin
    credentials: true,  // Required for cookies, authorization headers with HTTPS
}));
app.use(express.json());
app.use(cookieParser());

// Handle WebSocket connections
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle joining a specific room for a user
    socket.on('join', (userId: string) => {
        socket.join(userId); // Join a room with the user's ID
        console.log(`User ${userId} joined room`);
    });

    // Emit a notification to a specific user
    socket.on('sendNotification', async (data) => {
        const { recipientId, type, message } = data;

        try {
            const notification = await Notification.create({
                recipient: recipientId,
                type,
                message,
                status: "new",
            });

            io.to(recipientId).emit('receiveNotification', notification);

        } catch (err) {
            console.error('Error sending notification:', err);
        }
    });

     // Listen for a mark-as-read event from the client
     socket.on('markAsRead', async (notificationId) => {
        try {
            const notification = await Notification.findById(notificationId);

            if (notification) {
                notification.status = 'seen';
                await notification.save();

                // Notify the client that the status has been updated
                socket.emit('notificationUpdated', notification);
            }
        } catch (err) {
            console.error('Error updating notification:', err);
        }
    });

    // Listen for a bulk mark-as-read event
    socket.on('markAllAsRead', async (recipientId) => {
        try {
            const updatedNotifications = await Notification.updateMany(
                { recipient: recipientId, status: 'new' },
                { $set: { status: 'seen' } }
            );

            // Notify the client about the bulk update
            socket.emit('allNotificationsUpdated', updatedNotifications);
        } catch (err) {
            console.error('Error updating notifications:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Middleware to serve static files
app.use('/src/assets', express.static(path.join(__dirname, 'src/assets')));

app.get('/src/assets/contract_template.docx', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'src/assets/contract_template.docx'));
});

// Connect to database
connectToDb();

// Apply multer middleware globally
app.use(upload.single('bookPic'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/cars', carRoutes); // Register the car routes
app.use('/api/customers', customerRoutes); // Register the customer routes
app.use('/api/notifications', notificationRoutes); // manipulate notifications

// List all routes
app.get('/routes', (req: Request, res: Response) => {
    res.status(200).send(endPoints(app));
});

// Set up port and listen
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
