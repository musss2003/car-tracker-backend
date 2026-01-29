import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Car } from './car.model';
import { User } from './user.model';

@Entity('car_service_history')
@Index(['carId'])
@Index(['serviceDate'])
@Index(['nextServiceDate'])
export class CarServiceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User who created the record
  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relation to Car (cannot be deleted)
  @Column({ name: 'car_id' })
  carId: string;

  @ManyToOne(() => Car, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  // Service details
  @Column({ name: 'service_date', type: 'date' })
  serviceDate: Date;

  @Column({ type: 'integer', nullable: true })
  mileage?: number;

  @Column({ name: 'service_type', type: 'varchar', length: 100 })
  serviceType: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Next service info
  @Column({ name: 'next_service_km', type: 'integer', nullable: true })
  nextServiceKm?: number;

  @Column({ name: 'next_service_date', type: 'date', nullable: true })
  nextServiceDate?: Date;

  // Cost
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost?: number;

  // Additional fields (like Contract pattern)
  @Column({ name: 'additional_notes', type: 'text', nullable: true })
  additionalNotes?: string;

  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  notificationSent: boolean;

  // User who last updated
  @Column({ name: 'updated_by', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt?: Date;
}

export interface ICarServiceHistory {
  id: string;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  carId: string;
  car: Car;
  serviceDate: Date;
  mileage?: number;
  serviceType: string;
  description?: string;
  nextServiceKm?: number;
  nextServiceDate?: Date;
  cost?: number;
  additionalNotes?: string;
  notificationSent: boolean;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default CarServiceHistory;
