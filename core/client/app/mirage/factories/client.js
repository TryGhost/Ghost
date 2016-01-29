/* jscs:disable */
import Mirage, {faker} from 'ember-cli-mirage';

export default Mirage.Factory.extend({
  uuid() { return `c712cbcd-326d-4f85-a8e0`; },
  name: faker.list.cycle('Ghost Admin', 'Ghost Frontend', 'Twitter', 'Github', 'Facebook'),
  slug: faker.list.cycle('ghost-admin', 'ghost-frontend', 'twitter', 'github', 'facebook'),
  type() { return 'ua'; },
  secret() { return `2f5c4f6291e`; },
  redirection_uri() { return null; },
  logo() { return faker.internet.avatar(); },
  status() { return 'enabled'; },
  description() { return null; },
  created_at() { return '2015-12-07T17:55:06.861Z'; },
  created_by() { return 1; },
  updated_at() { return '2015-12-07T17:55:06.861Z'; },
  updated_by() { return 1; },
});
