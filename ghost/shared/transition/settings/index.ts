import { defineService } from '@tryghost/kernel/define-service';
import { legacyDependencies } from './legacy-dependencies';

/**
 * TRANSITIONAL. Hands `ghost/shared/settings` what it still takes from legacy
 * Core. It starts nothing; it is a root so that the shared list can name it
 * and settings can name it in `needs`. It goes when the list in
 * `./legacy-dependencies.ts` is empty.
 */
export default defineService('Settings transition', () => legacyDependencies());
