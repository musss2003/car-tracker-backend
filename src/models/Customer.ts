
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customers')
export class Customer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    email?: string; // Optional

    @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
    phoneNumber?: string; // Optional

    @Column({ type: 'text', nullable: true })
    address?: string; // Optional

    @Column({ name: 'driver_license_number', type: 'varchar', length: 50 })
    driverLicenseNumber: string;

    @Column({ name: 'passport_number', type: 'varchar', length: 50 })
    passportNumber: string;

    @Column({ name: 'country_of_origin', type: 'varchar', length: 100, nullable: true })
    countryOfOrigin?: string;

    @Column({ name: 'driver_license_photo_url', type: 'text', nullable: true })
    drivingLicensePhotoUrl?: string;

    @Column({ name: 'passport_photo_url', type: 'text', nullable: true })
    passportPhotoUrl?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// Export interface for compatibility
export interface ICustomer {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    driverLicenseNumber: string;
    passportNumber: string;
    countryOfOrigin?: string;
    drivingLicensePhotoUrl?: string;
    passportPhotoUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export default Customer;
