import CarIssueReport, { IssueSeverity, IssueStatus } from '../models/car-issue-report.model';
import Car from '../models/car.model';
import { BaseService } from '../common/services/base.service';
import { AuditResource } from '../models/audit-log.model';
import carIssueReportRepository, {
  CarIssueReportRepository,
} from '../repositories/car-issue-report.repository';
import { AppDataSource } from '../config/db';
import { CreateCarIssueReportDto, UpdateCarIssueReportDto } from '../dto/car-issue-report.dto';
import { NotFoundError } from '../common/errors';
import { AuditContext } from '../common/interfaces';

/**
 * Service for CarIssueReport business logic
 */
export class CarIssueReportService extends BaseService<
  CarIssueReport,
  CreateCarIssueReportDto,
  UpdateCarIssueReportDto
> {
  private carRepository = AppDataSource.getRepository(Car);

  constructor(repository: CarIssueReportRepository) {
    super(repository, AuditResource.CAR_ISSUE_REPORT);
  }

  /**
   * Create a new issue report with validation
   */
  async create(data: CreateCarIssueReportDto, context?: AuditContext): Promise<CarIssueReport> {
    // Verify car exists
    const car = await this.carRepository.findOne({ where: { id: data.carId } });
    if (!car) {
      throw new NotFoundError('Car', data.carId);
    }

    // Set reportedById from the authenticated user (column name differs from base service's createdById)
    const enrichedData = context?.userId ? { ...data, reportedById: context.userId } : data;

    return super.create(enrichedData as CreateCarIssueReportDto, context);
  }

  /**
   * Get all issue reports for a specific car
   */
  async getByCarId(carId: string, _context?: AuditContext): Promise<CarIssueReport[]> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.findByCarId(carId);
  }

  /**
   * Get issue reports by status
   */
  async getByStatus(status: IssueStatus): Promise<CarIssueReport[]> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.findByStatus(status);
  }

  /**
   * Get issue reports by severity
   */
  async getBySeverity(severity: IssueSeverity): Promise<CarIssueReport[]> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.findBySeverity(severity);
  }

  /**
   * Get open issues
   */
  async getOpenIssues(): Promise<CarIssueReport[]> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.findOpenIssues();
  }

  /**
   * Get issues by car and status
   */
  async getByCarIdAndStatus(carId: string, status: IssueStatus): Promise<CarIssueReport[]> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.findByCarIdAndStatus(carId, status);
  }

  /**
   * Count issues by car and status
   */
  async countByCarIdAndStatus(carId: string, status: IssueStatus): Promise<number> {
    const repo = this.repository as CarIssueReportRepository;
    return repo.countByCarIdAndStatus(carId, status);
  }

  /**
   * Custom audit description for create operations
   */
  protected getCreateDescription(entity: CarIssueReport): string {
    return `Created issue report for car ${entity.carId}${entity.severity ? ` - ${entity.severity}` : ''}`;
  }

  /**
   * Custom audit description for update operations
   */
  protected getUpdateDescription(before: CarIssueReport, after: CarIssueReport): string {
    const changes: string[] = [];

    if (before.status !== after.status) {
      changes.push(`status: ${before.status} → ${after.status}`);
    }
    if (before.severity !== after.severity) {
      changes.push(`severity: ${before.severity} → ${after.severity}`);
    }
    if (before.description !== after.description) {
      changes.push(`description updated`);
    }

    return `Updated issue report ${after.id}${changes.length ? ` (${changes.join(', ')})` : ''}`;
  }

  /**
   * Custom audit description for delete operations
   */
  protected getDeleteDescription(entity: CarIssueReport): string {
    return `Deleted issue report for car ${entity.carId}`;
  }

  /**
   * Get count of active (open) issue reports for a car
   * Optimized to use repository count method
   */
  async getActiveCount(carId: string, _context?: AuditContext): Promise<number> {
    const repo = this.repository as CarIssueReportRepository;
    // Use repository's count method instead of filtering - more efficient
    return repo.countByCarIdAndStatus(carId, IssueStatus.OPEN);
  }
}

export default new CarIssueReportService(carIssueReportRepository);
