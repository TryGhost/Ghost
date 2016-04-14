/* jscs:disable */
import Mirage, {faker} from 'ember-cli-mirage';

export default Mirage.Factory.extend({
  domain() { return `https://twitter.com/`; }
});
