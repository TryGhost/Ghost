// A service root moved in unchanged. Boot would still own it, so the domain
// layer must not find or start it.
import { journal } from '../../../../../domain-foundation';

export const init = () => {
  journal.push('started old-catalogue from transition');
};
