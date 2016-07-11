export function initialize(application) {
    application.inject('route', 'upgradeStatus', 'service:upgrade-status');
}

export default {
    name: 'upgrade-status',
    initialize
};
