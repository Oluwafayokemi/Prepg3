// lambda/shared/utils/validators.ts
import { ValidationError } from './errors';

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validatePositiveNumber(value: number, fieldName: string): void {
  if (typeof value !== 'number' || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive number`);
  }
}

export function validatePercentage(value: number, fieldName: string): void {
  if (typeof value !== 'number' || value < 0 || value > 100) {
    throw new ValidationError(`${fieldName} must be between 0 and 100`);
  }
}