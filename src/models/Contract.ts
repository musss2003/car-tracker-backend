import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { Customer } from "./Customer";
import { Car } from "./Car";
import { User } from "./User";

@Entity("contracts")
export class Contract {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // User who created the contract
  @Column({ name: "created_by" })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  // Relationship with Customer (cannot be deleted)
  @Column({ name: "customer_id" })
  customerId: string;

  @ManyToOne(() => Customer, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  // Relationship with Car (cannot be deleted — only archived)
  @Column({ name: "car_id" })
  carId: string;

  @ManyToOne(() => Car, { eager: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  // Rental Period
  @Column({ name: "start_date", type: "date" })
  startDate: Date;

  @Column({ name: "end_date", type: "date" })
  endDate: Date;

  // Rental Price
  @Column({ name: "daily_rate", type: "decimal", precision: 10, scale: 2 })
  dailyRate: number;

  @Column({ name: "total_amount", type: "decimal", precision: 10, scale: 2 })
  totalAmount: number;

  // Additional fields
  @Column({ name: "additional_notes", type: "text", nullable: true })
  additionalNotes?: string;

  @Column({ name: "photo_url", type: "text" })
  photoUrl: string;

  @Column({ name: "updated_by", nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy?: User;

  @UpdateDateColumn({ name: "updated_at", nullable: true })
  updatedAt?: Date;
}

export interface IContract {
  id: string;
  createdById: string;
  createdBy: User;
  createdAt: Date;
  customerId: string;
  customer: Customer;
  carId: string;
  car: Car;
  startDate: Date;
  endDate: Date;
  dailyRate: number;
  totalAmount: number;
  additionalNotes?: string;
  photoUrl: string;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
}

export default Contract;
