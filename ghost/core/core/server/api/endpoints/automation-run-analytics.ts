import * as automationsApi from '../../services/automations/automations-api';

type BrowseFrame = {
    options: {
        automation_id?: string;
        include?: 'series';
        date_from?: string;
        date_to?: string;
        withRelated?: string[];
    };
};

const controller = {
    docName: 'automation_run_analytics',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'automation_id',
            'include',
            'date_from',
            'date_to'
        ],
        validation: {
            options: {
                include: {
                    values: ['series']
                }
            }
        },
        permissions: {
            docName: 'automations',
            method: 'browse'
        },
        async query(frame: BrowseFrame) {
            return await automationsApi.browseRunAnalytics({
                ...frame.options,
                include: frame.options.withRelated?.includes('series') ? 'series' : undefined
            });
        }
    }
};

module.exports = controller;
