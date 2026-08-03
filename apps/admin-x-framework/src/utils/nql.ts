// Re-exported so consumers of this package keep a stable `./utils/nql` entry
// point. The implementation lives in @tryghost/nql-string so that the admin,
// the Ember admin and ghost/core all escape filter values identically.
export {escapeNqlString} from '@tryghost/nql-string';
