import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn 
} from 'typeorm';

export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';
export type TransmissionType = 'manual' | 'automatic';
export type CarStatus = 'available' | 'rented' | 'maintenance' | 'unavailable';
export type CarCategory = 'economy' | 'luxury' | 'suv' | 'van' | 'family' | 'business';

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
  color?: string;

  @Column({ name: 'license_plate', type: 'varchar', length: 20, unique: true })
  licensePlate: string;

  @Column({ name: 'chassis_number', type: 'varchar', length: 50, nullable: true })
  chassisNumber?: string;

  @Column({ name: 'fuel_type', type: 'varchar', length: 20 })
  fuelType: FuelType;

  @Column({ type: 'varchar', length: 20 })
  transmission: TransmissionType;

  @Column({ type: 'integer', nullable: true })
  seats?: number;

  @Column({ type: 'integer', nullable: true })
  doors?: number;

  @Column({ type: 'integer', nullable: true })
  mileage?: number; // in kilometers

  @Column({ name: 'engine_power', type: 'integer', nullable: true })
  enginePower?: number; // in HP

  @Column({ name: 'price_per_day', type: 'decimal', precision: 10, scale: 2 })
  pricePerDay: number;

  @Column({ name: 'category', type: 'varchar', length: 50, default: 'economy' })
  category: CarCategory;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'available' })
  status: CarStatus;

  @Column({ name: 'current_location', type: 'varchar', length: 100, nullable: true })
  currentLocation?: string;

  @Column({ name: 'photo_url', type: 'text', nullable: true })
  photoUrl?: string;

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
  fuelType: FuelType;
  transmission: TransmissionType;
  seats?: number;
  doors?: number;
  mileage?: number;
  enginePower?: number;
  pricePerDay: number;
  category: CarCategory;
  status: CarStatus;
  currentLocation?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default Car;
