import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';
import { User } from './user.model';

/**
 * Notification status enum
 */
export enum NotificationStatus {
  NEW = 'new',
  SEEN = 'seen'
}

/**
 * Notification Entity
 */
@Entity('notifications')
@Index(['recipientId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['recipientId', 'status']) // Composite for unread notifications
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Recipient (required)
  @Column({ name: 'recipient_id' })
  recipientId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  // Sender (optional)
  @Column({ name: 'sender_id', nullable: true })
  senderId?: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  // Notification details
  @Column({ type: 'varchar', length: 100 })
  type: string;

  @Column({ type: 'text' })
  message: string;

  // Status
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.NEW
  })
  status: NotificationStatus;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt?: Date;
}

/**
 * Notification interface
 */
export interface INotification {
  id: string;
  recipientId: string;
  recipient: User;
  senderId?: string;
  sender?: User;
  type: string;
  message: string;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt?: Date;
}

export default Notification;