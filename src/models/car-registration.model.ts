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

@Entity('car_registration')
@Index(['carId'])
@Index(['registrationExpiry'])
export class CarRegistration {
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

  // Registration dates
  @Column({ name: 'registration_expiry', type: 'date' })
  registrationExpiry: Date;

  @Column({ name: 'renewal_date', type: 'date' })
  renewalDate: Date;

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

export interface ICarRegistration {
  id: string;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  carId: string;
  car: Car;
  registrationExpiry: Date;
  renewalDate: Date;
  additionalNotes?: string;
  notificationSent: boolean;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default CarRegistration;
