import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn
} from "typeorm";
import Car from "./car.model";

@Entity("car_service_history")
export class CarServiceHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Car, { onDelete: "CASCADE" })
  @JoinColumn({ name: "car_id" })
  car: Car;

  @Column({ name: "car_id" })
  carId: string;

  @Column({ name: "service_date", type: "date" })
  serviceDate: Date;

  @Column({ type: "integer", nullable: true })
  mileage?: number;

  @Column({ name: "service_type", type: "varchar", length: 100 })
  serviceType: string; // oil, filters, inspection...

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ name: "next_service_km", type: "integer", nullable: true })
  nextServiceKm?: number;

  @Column({ name: "next_service_date", type: "date", nullable: true })
  nextServiceDate?: Date;

  @Column({ type: "numeric", nullable: true })
  cost?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}

export default CarServiceHistory;
