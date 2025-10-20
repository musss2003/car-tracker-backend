import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import User from "./User";

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "created_by" })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "created_by" })
  createdBy: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email?: string; // Optional

  @Column({ name: "phone_number", type: "varchar", length: 20, nullable: true })
  phoneNumber?: string; // Optional

  @Column({ type: "text", nullable: true })
  address?: string; // Optional

  @Column({ name: "driver_license_number", type: "varchar", length: 50 })
  driverLicenseNumber: string;

  @Column({ name: "passport_number", type: "varchar", length: 50 })
  passportNumber: string;

  @Column({ name: "father_name", type: "varchar", length: 255, nullable: true })
  fatherName?: string; // Optional

  @Column({
    name: "city_of_residence",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  cityOfResidence?: string; // Optional

  @Column({ name: "id_of_person", type: "varchar", length: 50, nullable: true })
  idOfPerson?: string; // Optional - personal ID number

  @Column({
    name: "country_of_origin",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  countryOfOrigin?: string;

  @Column({ name: "driver_license_photo_url", type: "text", nullable: true })
  drivingLicensePhotoUrl?: string;

  @Column({ name: "passport_photo_url", type: "text", nullable: true })
  passportPhotoUrl?: string;

  @Column({ name: "updated_by" })
  updatedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "updated_by" })
  updatedBy: User;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  // ✅ Archiving (instead of deleting)
  @Column({ name: "is_deleted", type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ name: "deleted_at", type: "timestamp", nullable: true })
  deletedAt?: Date;

  @Column({ name: "deleted_by" })
  deletedById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "deleted_by" })
  deletedBy: User;
}

// Export interface for compatibility
export interface ICustomer {
  id: string;
  createdById?: string;
  createdBy?: User;
  createdAt: Date;
  name: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  driverLicenseNumber: string;
  passportNumber: string;
  fatherName?: string;
  cityOfResidence?: string;
  idOfPerson?: string;
  countryOfOrigin: string;
  drivingLicensePhotoUrl: string;
  passportPhotoUrl: string;
  updatedById?: string;
  updatedBy?: User;
  updatedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedById?: string;
  deletedBy?: User;
}

export default Customer;
