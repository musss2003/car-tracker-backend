import { Server } from 'socket.io';
import http from 'http';
import { AppDataSource } from './db';
import { Notification, NotificationStatus } from '../models/notification.model';
import { User } from '../models/user.model';

// Store online users in memory (userId -> socketId mapping)
export const onlineUsers = new Map<string, Set<string>>();

/**
 * Initialize Socket.IO server with CORS configuration
 */
export function initializeSocketIO(server: http.Server, allowedOrigins: string[]): Server {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow WebSocket transport
    transports: ['websocket', 'polling'],
  });

  // Handle WebSocket connections
  io.on('connection', (socket) => {
    // Handle user going online
    socket.on('user:online', async (userId: string) => {
      try {
        // Add user to online users map
        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId)!.add(socket.id);

        // Update last_active_at in database
        const userRepository = AppDataSource.getRepository(User);
        await userRepository.update(userId, { lastActiveAt: new Date() });

        // Join user's personal room
        socket.join(userId);

        // Store userId in socket for later use
        (socket as any).userId = userId;

        // Broadcast to all clients that this user is online
        io.emit('user:status', { userId, isOnline: true });
      } catch (err) {
        console.error('Error marking user online:', err);
      }
    });

    // Handle joining a specific room for a user (kept for backward compatibility)
    socket.on('join', (userId: string) => {
      socket.join(userId); // Join a room with the user's ID
    });

    // Emit a notification to a specific user
    socket.on('sendNotification', async (data) => {
      const { recipientId, type, message, senderId } = data;

      try {
        const notificationRepository = AppDataSource.getRepository(Notification);

        const notification = notificationRepository.create({
          recipientId,
          senderId: senderId || undefined,
          type,
          message,
          status: NotificationStatus.NEW,
        });

        const savedNotification = await notificationRepository.save(notification);
        io.to(recipientId).emit('receiveNotification', savedNotification);
      } catch (err) {
        console.error('Error sending notification:', err);
      }
    });

    // Listen for a mark-as-read event from the client
    socket.on('markAsRead', async (notificationId) => {
      try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const notification = await notificationRepository.findOne({
          where: { id: notificationId },
        });

        if (notification) {
          notification.status = NotificationStatus.SEEN;
          const updatedNotification = await notificationRepository.save(notification);

          // Notify the client that the status has been updated
          socket.emit('notificationUpdated', updatedNotification);
        }
      } catch (err) {
        console.error('Error updating notification:', err);
      }
    });

    // Listen for a bulk mark-as-read event
    socket.on('markAllAsRead', async (recipientId) => {
      try {
        const notificationRepository = AppDataSource.getRepository(Notification);
        const updateResult = await notificationRepository.update(
          { recipientId, status: NotificationStatus.NEW },
          { status: NotificationStatus.SEEN }
        );

        // Notify the client about the bulk update
        socket.emit('allNotificationsUpdated', {
          affected: updateResult.affected,
        });
      } catch (err) {
        console.error('Error updating notifications:', err);
      }
    });

    socket.on('disconnect', async () => {
      // Handle user going offline
      const userId = (socket as any).userId;
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId)!;
        userSockets.delete(socket.id);

        // If user has no more active sockets, mark as offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Update last_active_at in database
          try {
            const userRepository = AppDataSource.getRepository(User);
            await userRepository.update(userId, { lastActiveAt: new Date() });
          } catch (err) {
            console.error('Error updating last active:', err);
          }

          // Broadcast to all clients that this user is offline
          io.emit('user:status', { userId, isOnline: false });
        }
      }
    });
  });

  console.log('✅ Socket.IO initialized with event handlers');
  return io;
}
