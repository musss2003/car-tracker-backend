import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Customer } from './Customer';
import { Car } from './Car';

// Define payment method and status enums
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid'
}

@Entity('contracts')
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Relationship with Customer
  @Column({ name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  // Relationship with Car
  @Column({ name: 'car_id' })
  carId: string;

  @ManyToOne(() => Car, { eager: true })
  @JoinColumn({ name: 'car_id' })
  car: Car;

  // Rental Period
  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date' })
  endDate: Date;

  // Rental Price
  @Column({ name: 'daily_rate', type: 'decimal', precision: 10, scale: 2 })
  dailyRate: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  // Payment Details
  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod
  })
  paymentMethod: PaymentMethod;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  paymentStatus: PaymentStatus;

  // Additional fields
  @Column({ name: 'additional_notes', type: 'text', nullable: true })
  additionalNotes?: string;

  @Column({ name: 'contract_photo', type: 'text', nullable: true })
  contractPhoto?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// Export interface for compatibility
export interface IContract {
  id: string;
  customerId: string;
  customer?: Customer;
  carId: string;
  car?: Car;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  additionalNotes?: string;
  contractPhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default Contract;
