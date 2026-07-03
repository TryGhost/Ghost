/** Recurring: deletes member auth tokens older than 24 hours. */
export default class CleanTokensJob {
    static type = 'clean-tokens';
}
