import { AppDataSource } from "../config/db";
import { Car } from "../models/Car";
import { Cache, invalidateCache, invalidateCachePattern } from "../common/decorators/cache.decorator";

export class CarService {
  private carRepository = AppDataSource.getRepository(Car);

  /**
   * Get all cars with caching (5 minutes)
   */
  @Cache({ ttl: 300, prefix: 'cars' })
  async getAllCars() {
    return await this.carRepository.find({
      order: { createdAt: "ASC" },
      relations: ["createdBy", "updatedBy", "archivedBy", "deletedBy"]
    });
  }

  /**
   * Get car by ID with caching (5 minutes)
   */
  @Cache({ ttl: 300, prefix: 'car' })
  async getCarById(id: string) {
    return await this.carRepository.findOne({ 
      where: { id },
      relations: ["createdBy", "updatedBy", "archivedBy", "deletedBy"]
    });
  }

  /**
   * Get available cars with caching (2 minutes)
   */
  @Cache({ ttl: 120, prefix: 'cars:available' })
  async getAvailableCars() {
    return await this.carRepository.find({
      where: { status: "available", isArchived: false, isDeleted: false },
      order: { createdAt: "ASC" },
      relations: ["createdBy"]
    });
  }

  /**
   * Create a new car and invalidate cache
   */
  async createCar(carData: Partial<Car>) {
    const newCar = this.carRepository.create(carData);
    const savedCar = await this.carRepository.save(newCar);
    
    // Invalidate all car-related caches
    await this.invalidateCarCaches();
    
    return savedCar;
  }

  /**
   * Update a car and invalidate cache
   */
  async updateCar(id: string, carData: Partial<Car>) {
    await this.carRepository.update(id, carData);
    const updatedCar = await this.carRepository.findOne({ 
      where: { id },
      relations: ["createdBy", "updatedBy", "archivedBy", "deletedBy"]
    });
    
    // Invalidate specific car cache and list caches
    await invalidateCache('CarService', 'getCarById', id);
    await this.invalidateCarCaches();
    
    return updatedCar;
  }

  /**
   * Delete a car and invalidate cache
   */
  async deleteCar(id: string, userId: string) {
    await this.carRepository.update(id, { 
      isDeleted: true, 
      deletedAt: new Date(),
      deletedById: userId
    });
    
    // Invalidate specific car cache and list caches
    await invalidateCache('CarService', 'getCarById', id);
    await this.invalidateCarCaches();
  }

  /**
   * Archive a car and invalidate cache
   */
  async archiveCar(id: string, userId: string) {
    await this.carRepository.update(id, { 
      isArchived: true, 
      archivedAt: new Date(),
      archivedById: userId
    });
    
    // Invalidate specific car cache and list caches
    await invalidateCache('CarService', 'getCarById', id);
    await this.invalidateCarCaches();
  }

  /**
   * Update car status and invalidate cache
   */
  async updateCarStatus(id: string, status: string) {
    await this.carRepository.update(id, { status: status as any });
    
    // Invalidate specific car cache and list caches
    await invalidateCache('CarService', 'getCarById', id);
    await this.invalidateCarCaches();
  }

  /**
   * Helper to invalidate all car-related caches
   */
  private async invalidateCarCaches() {
    await invalidateCache('CarService', 'getAllCars');
    await invalidateCache('CarService', 'getAvailableCars');
    // Invalidate pattern for all individual car caches
    await invalidateCachePattern('car:CarService:getCarById:*');
  }
}

export const carService = new CarService();
