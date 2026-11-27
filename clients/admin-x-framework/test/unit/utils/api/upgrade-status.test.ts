import { getUpgradeStatus } from '../../../../src/utils/api/upgrade-status';
import {
  APIError,
  type ErrorResponse,
  JSONError,
  MaintenanceError,
  ServerUnreachableError,
  VersionMismatchError,
} from '../../../../src/utils/errors';

describe('getUpgradeStatus', () => {
  const response = new Response();
  const data: ErrorResponse = { errors: [] };

  it('treats a version mismatch as a required upgrade', () => {
    expect(getUpgradeStatus(new VersionMismatchError(response, data))).toBe('upgrade-required');
  });

  it('treats a maintenance error as maintenance', () => {
    expect(getUpgradeStatus(new MaintenanceError(response, 'Maintenance'))).toBe('maintenance');
  });

  it('ignores other errors', () => {
    expect(getUpgradeStatus(new JSONError(response, data))).toBeNull();
    expect(getUpgradeStatus(new APIError(response))).toBeNull();
    expect(getUpgradeStatus(new ServerUnreachableError())).toBeNull();
    expect(getUpgradeStatus(new Error('Network'))).toBeNull();
    expect(getUpgradeStatus(undefined)).toBeNull();
  });
});
