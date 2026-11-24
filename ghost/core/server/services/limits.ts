import { LimitService } from '@tryghost/limit-service';
import { ghostFoundation } from '../../../bootstrap/foundation';
import { loadLimits } from '../../../shared/limits';

// The bridge to shared/limits, which now holds the logic. 23 files import this
// instance, some as they load, so it is still created here. It goes when those
// files are handed the limit service instead of importing it.
export const limitService = new LimitService();

// Boot hands the foundation to shared/limits itself. This is for the tests
// that reload the limits after changing config.
export const init = () => loadLimits(limitService, ghostFoundation());
