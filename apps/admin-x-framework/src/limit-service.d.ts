declare module '@tryghost/limit-service' {
  type LimitOptions = Record<string, unknown>;
  export default class LimitService {
    loadLimits(config: {
      limits: object;
      subscription?: unknown;
      helpLink?: string;
      db?: unknown;
      errors: Record<string, unknown>;
    }): void;
    isLimited(limitName: string): boolean;
    isDisabled(limitName: string): boolean;
    checkIsOverLimit(limitName: string, options?: LimitOptions): Promise<boolean>;
    checkWouldGoOverLimit(limitName: string, options?: LimitOptions): Promise<boolean>;
    errorIfIsOverLimit(limitName: string, options?: LimitOptions): Promise<void>;
    errorIfWouldGoOverLimit(limitName: string, options?: LimitOptions): Promise<void>;
    checkIfAnyOverLimit(options?: LimitOptions): Promise<boolean>;
  }
}
