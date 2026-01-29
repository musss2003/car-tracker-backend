import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Car } from './car.model';
import { User } from './user.model';

/**
 * Car Insurance Entity - Follows same pattern as Contract
 */
@Entity('car_insurance')
@Index(['carId']) // Index for car's insurance records
@Index(['insuranceExpiry']) // Index for expiring insurance
export class CarInsurance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User who created the insurance record
  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relationship with Car (cannot be deleted — only archived)
  @Column({ name: 'car_id' })
  carId: string;

  @ManyToOne(() => Car, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  // Insurance Details
  @Column({ name: 'policy_number', type: 'varchar', length: 100, nullable: true })
  policyNumber?: string;

  @Column({ name: 'provider', type: 'varchar', length: 255, nullable: true })
  provider?: string;

  @Column({ name: 'insurance_expiry', type: 'date' })
  insuranceExpiry: Date;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number;

  // Additional fields
  @Column({ name: 'additional_notes', type: 'text', nullable: true })
  additionalNotes?: string;

  @Column({ name: 'notification_sent', type: 'boolean', default: false })
  notificationSent: boolean;

  // User who last updated the insurance
  @Column({ name: 'updated_by', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt?: Date;
}

/**
 * Car Insurance Interface - Clean type definition
 */
export interface ICarInsurance {
  id: string;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  carId: string;
  car: Car;
  policyNumber?: string;
  provider?: string;
  insuranceExpiry: Date;
  price?: number;
  additionalNotes?: string;
  notificationSent: boolean;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default CarInsurance;
