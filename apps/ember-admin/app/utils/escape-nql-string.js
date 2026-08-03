// Re-exported so existing `ghost-admin/utils/escape-nql-string` imports keep
// working. The implementation lives in @tryghost/nql-string so that the admin,
// the Ember admin and ghost/core all escape filter values identically.
export {escapeNqlString} from '@tryghost/nql-string';
