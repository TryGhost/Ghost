import type { ErrorsModule } from '@tryghost/limit-service';
import { HostLimitError } from './errors';

// limit-service constructs its misconfiguration error with a single options object
class IncorrectUsageError extends Error {
  constructor({ message }: { message: string }) {
    super(message);
  }
}

export const LIMIT_SERVICE_ERRORS: ErrorsModule = { HostLimitError, IncorrectUsageError };
