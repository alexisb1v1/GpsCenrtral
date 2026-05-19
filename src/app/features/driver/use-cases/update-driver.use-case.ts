import { Result } from 'neverthrow';
import { Driver } from '../models/driver.model';
import { DriverRepository } from '../repositories/driver.repository';
import { DomainError } from '@/shared/errors/error-codes';
import { UpdateDriverDto } from '../dto/driver.dto';

export class UpdateDriverUseCase {
  constructor(private readonly repository: DriverRepository) {}

  async execute(id: string, data: UpdateDriverDto): Promise<Result<Driver, DomainError>> {
    return await this.repository.update(id, data);
  }
}
