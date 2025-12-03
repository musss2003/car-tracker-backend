import { AppDataSource } from '../config/db';
import CarIssueReport from '../models/CarIssueReport';
import { BaseRepository } from '../common/repositories/base.repository';

/**
 * Repository for CarIssueReport entity
 */
export class CarIssueReportRepository extends BaseRepository<CarIssueReport> {
  constructor() {
    super(AppDataSource.getRepository(CarIssueReport));
  }

  /**
   * Find all issue reports for a specific car
   */
  async findByCarId(carId: string): Promise<CarIssueReport[]> {
    return this.repository.find({
      where: { carId },
      relations: ['reportedBy', 'resolvedBy', 'updatedBy'],
      order: { reportedAt: 'DESC' },
    });
  }

  /**
   * Find issue reports by status
   */
  async findByStatus(status: 'open' | 'in_progress' | 'resolved'): Promise<CarIssueReport[]> {
    return this.repository.find({
      where: { status },
      relations: ['car', 'reportedBy'],
      order: { reportedAt: 'DESC' },
    });
  }

  /**
   * Find issue reports by severity
   */
  async findBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): Promise<CarIssueReport[]> {
    return this.repository.find({
      where: { severity },
      relations: ['car', 'reportedBy'],
      order: { reportedAt: 'DESC' },
    });
  }

  /**
   * Find open issues (status = 'open')
   */
  async findOpenIssues(): Promise<CarIssueReport[]> {
    return this.findByStatus('open');
  }

  /**
   * Find issues by car and status
   */
  async findByCarIdAndStatus(
    carId: string,
    status: 'open' | 'in_progress' | 'resolved'
  ): Promise<CarIssueReport[]> {
    return this.repository.find({
      where: { carId, status },
      relations: ['reportedBy', 'resolvedBy'],
      order: { reportedAt: 'DESC' },
    });
  }

  /**
   * Count issues by status for a car
   */
  async countByCarIdAndStatus(carId: string, status: 'open' | 'in_progress' | 'resolved'): Promise<number> {
    return this.repository.count({
      where: { carId, status },
    });
  }
}

export default new CarIssueReportRepository();
