
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cars')
export class Car {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    manufacturer: string;

    @Column({ type: 'varchar', length: 100 })
    model: string;

    @Column({ type: 'integer' })
    year: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    color?: string; // Optional field

    @Column({ name: 'license_plate', type: 'varchar', length: 20, unique: true })
    licensePlate: string;

    @Column({ name: 'chassis_number', type: 'varchar', length: 50, nullable: true })
    chassisNumber?: string; // Optional field

    @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2, nullable: true })
    pricePerDay?: number; // Optional field

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
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
    pricePerDay?: number;
    createdAt: Date;
    updatedAt: Date;
}

export default Car;

