/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import DS from 'ember-data';
import ValidationEngine from 'ghost/mixins/validation-engine';

const {Model, attr} = DS;

export default Model.extend(ValidationEngine, {
  validationType: 'client',

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
