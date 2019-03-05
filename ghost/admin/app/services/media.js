import Service from '@ember/service';

// dummy service to account for not having the ember-responsive dependency
// available for ember-light-table (we don't use it so no need for the dep)
// see https://github.com/offirgolan/ember-light-table/issues/576
export default Service.extend({});
