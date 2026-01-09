import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn
} from "typeorm";
import Car from "./car.model";

@Entity("car_insurance")
export class CarInsurance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Car, { onDelete: "CASCADE" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  @Column({ name: "car_id" })
  carId: string;

  @Column({ name: "policy_number", type: "text", nullable: true })
  policyNumber?: string;

  @Column({ name: "provider", type: "text", nullable: true })
  provider?: string;

  @Column({ name: "insurance_expiry", type: "date" })
  insuranceExpiry: Date;

  @Column({ type: "numeric", nullable: true })
  price?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

export default CarInsurance;
