/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/concat.js @ 407e032dc7 — transforms: imports→seam
import { SafeString } from '../seam/handlebars-env.ts';

export default function concat(...args: any[]) {
  const options = args.pop();
  const separator = options.hash.separator || '';

  // Flatten arrays - if an argument is an array, spread its elements
  const flattenedArgs = args.flat();

  return new SafeString(flattenedArgs.join(separator));
}
