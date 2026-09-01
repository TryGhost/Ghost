import manifest from './policy.json';
import { parseQueryParameterPolicy } from './schema';

export const queryParameterPolicy = parseQueryParameterPolicy(manifest);
