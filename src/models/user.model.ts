import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
  USER = 'user',
}

@Entity('users')
@Index(['email']) // Index for email lookups
@Index(['username']) // Index for username lookups
@Index(['role']) // Index for role-based queries
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'citizenship_id', type: 'varchar', length: 50, nullable: true })
  citizenshipId?: string;

  @Column({ name: 'profile_photo_url', type: 'text', nullable: true })
  profilePhotoUrl?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'varchar', length: 255 })
  password: string; // Hashed password

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin?: Date;

  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// Export interface for compatibility
export interface IUser {
  id: string;
  name?: string;
  username: string;
  email: string;
  citizenshipId?: string;
  profilePhotoUrl?: string;
  phone?: string;
  address?: string;
  refreshToken?: string;
  password: string;
  role: UserRole;
  lastLogin?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default User;
