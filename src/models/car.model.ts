import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import User from './user.model';
import CarRegistration from './car-registration.model';
import CarInsurance from './car-insurance.model';
import CarServiceHistory from './car-service-history.model';
import CarIssueReport from './car-issue-report.model';

/**
 * @swagger
 * components:
 *   schemas:
 *     Car:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         manufacturer:
 *           type: string
 *         model:
 *           type: string
 *         year:
 *           type: integer
 *         color:
 *           type: string
 *         licensePlate:
 *           type: string
 *         chassisNumber:
 *           type: string
 *         fuelType:
 *           type: string
 *           enum: [petrol, diesel, hybrid, electric]
 *         transmission:
 *           type: string
 *           enum: [manual, automatic]
 *         seats:
 *           type: integer
 *         doors:
 *           type: integer
 *         mileage:
 *           type: number
 *         enginePower:
 *           type: string
 *         pricePerDay:
 *           type: number
 *         category:
 *           type: string
 *           enum: [economy, luxury, suv, van, family, business]
 *         status:
 *           type: string
 *           enum: [available, archived, deleted]
 *         currentLocation:
 *           type: string
 *         photoUrl:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';
export type TransmissionType = 'manual' | 'automatic';
export type CarStatus = 'available' | 'archived' | 'deleted';
export type CarCategory = 'economy' | 'luxury' | 'suv' | 'van' | 'family' | 'business';

@Entity('cars')
@Index(['licensePlate']) // Index for license plate lookups
@Index(['status']) // Index for filtering by status
@Index(['manufacturer']) // Index for filtering by manufacturer
@Index(['category']) // Index for filtering by category
@Index(['status', 'isArchived']) // Composite index for available cars queries
@Index(['manufacturer', 'model']) // Composite index for car search
export class Car {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User who created the contract
  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 100 })
  manufacturer: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color?: string;

  @Column({ name: 'license_plate', type: 'varchar', length: 20, unique: true })
  licensePlate: string;

  @Column({
    name: 'chassis_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  chassisNumber?: string;

  @Column({ name: 'fuel_type', type: 'varchar', length: 20 })
  fuelType: FuelType;

  @Column({ type: 'varchar', length: 20 })
  transmission: TransmissionType;

  @Column({ type: 'integer', nullable: true })
  seats?: number;

  @Column({ type: 'integer', nullable: true })
  doors?: number;

  @Column({ type: 'integer', nullable: true })
  mileage?: number; // in kilometers

  @Column({ name: 'engine_power', type: 'integer', nullable: true })
  enginePower?: number; // in HP

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ name: 'category', type: 'varchar', length: 50, default: 'economy' })
  category: CarCategory;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'available' })
  status: CarStatus;

  @Column({
    name: 'current_location',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  currentLocation?: string;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string;

  @OneToMany(() => CarRegistration, (registration) => registration.car)
  registrations: CarRegistration[];

  @OneToMany(() => CarInsurance, (insurance) => insurance.car)
  insurances: CarInsurance[];

  @OneToMany(() => CarServiceHistory, (service) => service.car)
  serviceHistory: CarServiceHistory[];

  @OneToMany(() => CarIssueReport, (service) => service.car)
  issueReports: CarIssueReport[];

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt?: Date;

  @Column({ name: 'updated_by', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;

  // ✅ Archiving (instead of deleting)
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'archived_by', nullable: true })
  archivedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'archived_by' })
  archivedBy?: User;

  // ✅ Archiving (instead of deleting)
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deletedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deleted_by' })
  deletedBy?: User;
}

// Export interface for compatibility
export interface ICar {
  id: string;
  manufacturer: string;
  model: string;
  year: number;
  color?: string;
  licensePlate: string;
  chassisNumber?: string;
  fuelType: FuelType;
  transmission: TransmissionType;
  seats?: number;
  doors?: number;
  mileage?: number;
  enginePower?: number;
  pricePerDay: number;
  category: CarCategory;
  status: CarStatus;
  currentLocation?: string;
  photoUrl?: string;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  archivedById?: string;
  archivedBy?: User;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedById?: string;
  deletedBy?: User;
}

export default Car;
