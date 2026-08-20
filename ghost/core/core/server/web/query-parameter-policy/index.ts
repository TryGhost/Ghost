import manifest from './policy.json';
import {validateQueryParameterPolicy} from './schema';

export const queryParameterPolicy = validateQueryParameterPolicy(manifest);
