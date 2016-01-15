/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import DS from 'ember-data';

const {Model, attr} = DS;

export default Model.extend({
  uuid: attr('string'),
  name: attr('string'),
  slug: attr('string'),
  type: attr('string', { defaultValue: 'ua' }),
  secret: attr('string'),
  redirection_uri: attr('string'),
  logo: attr('string'),
  status: attr('string', { defaultValue: 'enabled' }),
  description: attr('string'),
  created_at: attr('moment-date'),
  updated_at: attr('moment-date'),
  created_by: attr(),
  updated_by: attr()
});
