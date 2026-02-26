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
import { Customer } from './customer.model';
import { Car } from './car.model';
import { User } from './user.model';
import { Contract } from './contract.model';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
}

export enum BookingExtraType {
  SIM_CARD = 'sim_card',
  CHILD_SEAT = 'child_seat',
  KASKO_INSURANCE = 'kasko_insurance',
  ROOF_RACK = 'roof_rack',
  // For extras like child seat, roof rack, allow quantity selection in UI (not just checkbox)
}

export interface IBookingExtra {
  type: BookingExtraType;
  quantity: number;
  pricePerDay: number;
}

/**
 * Decimal transformer for converting between database decimal (string) and application number
 */
const decimalTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null | undefined): number | null | undefined =>
    value != null ? parseFloat(value) : value,
};

@Entity('bookings')
@Index(['customerId']) // Index for customer's bookings
@Index(['carId']) // Index for car's bookings
@Index(['status']) // Index for status queries
@Index(['startDate']) // Index for date range queries
@Index(['endDate']) // Index for expiring bookings
@Index(['expiresAt']) // Index for auto-expiration
@Index(['bookingReference'], { unique: true }) // Unique index for reference
@Index(['startDate', 'endDate']) // Composite index for date range overlaps
@Index(['carId', 'startDate', 'endDate']) // Composite index for car availability
@Index(['status', 'expiresAt']) // Composite index for expiration queries
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Booking Reference (auto-generated unique identifier)
  @Column({ name: 'booking_reference', unique: true, length: 50 })
  bookingReference: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { eager: true, onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  // Relationship with Car (cannot be deleted)
  @Column({ name: 'car_id' })
  carId: string;

  @ManyToOne(() => Car, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  // Rental Period
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  // Status
  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  // Pricing with decimal transformers
  @Column({
    name: 'total_estimated_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalEstimatedCost: number;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  depositAmount: number;

  @Column({ name: 'deposit_paid', type: 'boolean', default: false })
  depositPaid: boolean;

  // Locations
  @Column({ name: 'pickup_location', type: 'varchar', length: 255, nullable: true })
  pickupLocation?: string;

  @Column({ name: 'pickup_location_notes', type: 'text', nullable: true })
  pickupLocationNotes?: string;

  @Column({ name: 'pickup_coordinates', type: 'json', nullable: true })
  pickupCoordinates?: { lat: number; lng: number };

  @Column({ name: 'dropoff_location', type: 'varchar', length: 255, nullable: true })
  dropoffLocation?: string;

  @Column({ name: 'dropoff_location_notes', type: 'text', nullable: true })
  dropoffLocationNotes?: string;

  @Column({ name: 'dropoff_coordinates', type: 'json', nullable: true })
  dropoffCoordinates?: { lat: number; lng: number };

  // Additional drivers (stored as JSON array)
  @Column({ name: 'additional_drivers', type: 'json', nullable: true })
  additionalDrivers?: string[];

  // Extras (stored as JSON)
  @Column({ name: 'extras', type: 'json', nullable: true })
  extras?: IBookingExtra[];

  // Notes
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  // Expiration
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  // Cancellation
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  // Confirmation timestamp
  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt?: Date;

  // Conversion to Contract
  @Column({ name: 'converted_to_contract_id', nullable: true })
  convertedToContractId?: string;

  @ManyToOne(() => Contract, { eager: false, nullable: true })
  @JoinColumn({ name: 'converted_to_contract_id' })
  convertedToContract?: Contract;

  @Column({ name: 'converted_at', type: 'timestamp', nullable: true })
  convertedAt?: Date;

  // User who created the booking
  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // User who last updated the booking
  @Column({ name: 'updated_by', nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User;

  @UpdateDateColumn({ name: 'updated_at', nullable: true })
  updatedAt?: Date;
}

export interface IBooking {
  id: string;
  bookingReference: string;
  customerId?: string;
  customer?: Customer;
  carId: string;
  car: Car;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  totalEstimatedCost: number;
  depositAmount: number;
  depositPaid: boolean;
  pickupLocation?: string;
  pickupLocationNotes?: string;
  pickupCoordinates?: { lat: number; lng: number };
  dropoffLocation?: string;
  dropoffLocationNotes?: string;
  dropoffCoordinates?: { lat: number; lng: number };
  additionalDrivers?: string[];
  extras?: IBookingExtra[];
  notes?: string;
  expiresAt: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  confirmedAt?: Date;
  convertedToContractId?: string;
  convertedToContract?: Contract;
  convertedAt?: Date;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default Booking;
