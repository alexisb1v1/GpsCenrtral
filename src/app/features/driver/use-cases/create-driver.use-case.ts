import { Result } from 'neverthrow';
import { Driver } from '../models/driver.model';
import { DriverRepository } from '../repositories/driver.repository';
import { DomainError } from '@/shared/errors/error-codes';
import { CreateDriverDto } from '../dto/driver.dto';

export class CreateDriverUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(data: CreateDriverDto): Promise<Result<Driver, DomainError>> {
    return await this.repository.create(data);
  }
}
