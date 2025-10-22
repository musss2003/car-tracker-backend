import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Car } from "./Car";
import { User } from "./User";

export type RegistrationStatus = "valid" | "expired";

@Entity("registrations")
export class Registration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Car, { eager: true })
  @JoinColumn({ name: "car_id" })
  car: Car;

  @Column({ name: "car_id" })
  carId: string;

  @Column({ name: "expires_at", type: "date" })
  expiresAt: Date;

  @Column({ name: "renewed_by", nullable: true })
  renewedById?: string;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: "renewed_by" })
  renewedBy?: User;

  @Column({ name: "renewed_at", type: "date", nullable: true })
  renewedAt?: Date;

  @Column({ name: "updated_by" })
  updatedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy: User;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

export interface IRegistration {
  id: string;
  carId: string;
  car?: Car;
  expiresAt: Date;
  renewedAt: Date;
  renewedById?: string;
  renewedBy?: User;
  updatedById?: string;
  updatedBy?: User;
  updatedAt: Date;
}

export default Registration;
