/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    created_at() { return  '2015-09-11T09:44:29.871Z'; },
    created_by() { return  1; },
    description(i) { return  `Description for tag ${i}.`; },
    hidden() { return  false; },
    image(i) { return  `/content/images/2015/10/tag-${i}.jpg`; },
    meta_description(i) { return  `Meta description for tag ${i}.`; },
    meta_title(i) { return  `Meta Title for tag ${i}`; },
    name(i) { return  `Tag ${i}`; },
    parent() { return  null; },
    slug(i) { return  `tag-${i}`; },
    updated_at() { return  '2015-10-19T16:25:07.756Z'; },
    updated_by() { return  1; },
    uuid(i) { return  `tag-${i}`; },
    count() {
        return {
            posts: 1
        };
    },
});
