/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
  uuid(i) { return `client-${i}`; },
  name(i) { return `User ${i}`; },
  slug(i) { return `ghost-${i}`; },
  type() { return 'ua'; },
  secret() { return `2f5c4f6291${i}e`; },
  redirection_uri() { return null; },
  logo() { return null; },
  status() { return 'enabled'; },
  description() { return null; },
  created_at() { return '2015-12-07T17:55:06.861Z'; },
  created_by() { return 1; },
  updated_at() { return '2015-12-07T17:55:06.861Z'; },
  updated_by() { return 1; },
});
