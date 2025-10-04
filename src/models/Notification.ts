import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './User';

// Define the Notification status enum
export enum NotificationStatus {
    NEW = 'new',
    SEEN = 'seen'
}

// Define the Notification entity for PostgreSQL
@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'recipient_id' })
    recipientId: string; // ID of the user receiving the notification

    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'recipient_id' })
    recipient: User;

    @Column({ name: 'sender_id', nullable: true })
    senderId?: string; // Optional: ID of the user sending the notification

    @ManyToOne(() => User, { eager: false, nullable: true })
    @JoinColumn({ name: 'sender_id' })
    sender?: User;

    @Column({ type: 'varchar', length: 100 })
    type: string; // Type of notification (e.g., "message", "alert")

    @Column({ type: 'text' })
    message: string; // Notification content

    @Column({
        type: 'enum',
        enum: NotificationStatus,
        default: NotificationStatus.NEW
    })
    status: NotificationStatus; // Status of the notification

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date; // Timestamp of creation
}

// Export interface for compatibility
export interface INotification {
    id: string;
    recipientId: string;
    recipient?: User;
    senderId?: string;
    sender?: User;
    type: string;
    message: string;
    status: NotificationStatus;
    createdAt: Date;
}

export default Notification;
