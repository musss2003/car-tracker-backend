/**
 * DTO for creating a new car issue report
 */
export interface CreateCarIssueReportDto {
  carId: string;
  reportedById?: string;
  description: string;
  diagnosticPdfUrl?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'in_progress' | 'resolved';
}

/**
 * DTO for updating a car issue report
 */
export interface UpdateCarIssueReportDto {
  description?: string;
  diagnosticPdfUrl?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'open' | 'in_progress' | 'resolved';
  resolvedById?: string;
  resolvedAt?: Date;
  updatedById?: string;
}

/**
 * Validation helper for car issue report data
 */
export function validateCarIssueReportData(data: Partial<CreateCarIssueReportDto>): string[] {
  const errors: string[] = [];

  if (!data.carId) {
    errors.push('Car ID is required');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (data.severity && !['low', 'medium', 'high', 'critical'].includes(data.severity)) {
    errors.push('Invalid severity level');
  }

  if (data.status && !['open', 'in_progress', 'resolved'].includes(data.status)) {
    errors.push('Invalid status');
  }

  return errors;
}
