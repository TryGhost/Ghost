import Controller from '@ember/controller';

/**
 * @typedef {import('../../services/dashboard-stats').SourceAttributionCount} SourceAttributionCount
*/

export default class AnalyticsController extends Controller {
    get post() {
        return this.model;
    }

    /**
     * @returns {SourceAttributionCount[]} - array of objects with source and count properties
     */
    get sources() {
        return [
            {
                source: 'Twitter',
                freeSignups: 12,
                paidConversions: 50
            },
            {
                source: 'Google',
                freeSignups: 9,
                paidConversions: 32
            },
            {
                source: 'Direct',
                freeSignups: 2,
                paidConversions: 40
            }
        ];
    }
}
