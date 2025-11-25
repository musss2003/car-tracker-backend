import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn
} from "typeorm";
import Car from "./Car";

@Entity("car_registration")
export class CarRegistration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Car, { onDelete: "CASCADE" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  @Column({ name: "car_id" })
  carId: string;

  @Column({ name: "registration_expiry", type: "date" })
  registrationExpiry: Date;

  @Column({ name: "renewal_date", type: "date" })
  renewalDate: Date;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

export default CarRegistration;
