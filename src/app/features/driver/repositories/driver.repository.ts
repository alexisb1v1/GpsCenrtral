import { Result } from 'neverthrow';
import { Driver } from '../models/driver.model';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateDriverDto, UpdateDriverDto } from '../dto/driver.dto';

export interface DriverRepository {
  getAll(tenantId?: string): Promise<Result<Driver[], DomainError>>;
  getById(id: string): Promise<Result<Driver, DomainError>>;
  create(data: CreateDriverDto): Promise<Result<Driver, DomainError>>;
  update(id: string, data: UpdateDriverDto): Promise<Result<Driver, DomainError>>;
}
