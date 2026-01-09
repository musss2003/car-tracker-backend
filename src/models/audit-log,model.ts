import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.model';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  EXPORT = 'EXPORT',
  UPLOAD = 'UPLOAD',
  DOWNLOAD = 'DOWNLOAD',
}

export enum AuditResource {
  CONTRACT = 'contract',
  CUSTOMER = 'customer',
  CAR = 'car',
  USER = 'user',
  AUTH = 'auth',
  NOTIFICATION = 'notification',
  COUNTRY = 'country',
  CAR_ISSUE_REPORT = 'car_issue_report',
  CAR_INSURANCE = 'car_insurance',
  CAR_REGISTRATION = 'car_registration',
  CAR_SERVICE_HISTORY = 'car_service_history',
}

export enum AuditStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['resource', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User Information
  @Column({ name: 'user_id', type: 'varchar', nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username?: string;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  // Action Information
  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
  })
  resource: AuditResource;

  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId?: string;

  // Details
  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  changes?: {
    before?: any;
    after?: any;
  };

  // Metadata
  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.SUCCESS,
  })
  status: AuditStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'integer', nullable: true, comment: 'Duration in milliseconds' })
  duration?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// Export interface for type safety
export interface IAuditLog {
  id: string;
  userId?: string;
  username?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  description: string;
  changes?: {
    before?: any;
    after?: any;
  };
  status: AuditStatus;
  errorMessage?: string;
  duration?: number;
  createdAt: Date;
}

export default AuditLog;