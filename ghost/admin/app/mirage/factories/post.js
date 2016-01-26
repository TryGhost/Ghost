/* jscs:disable */
import Mirage from 'ember-cli-mirage';

export default Mirage.Factory.extend({
    uuid(i) { return  `post-${i}`; },
    description(i) { return  `Title for post ${i}.`; },
    slug(i) { return  `post-${i}`; },
    markdown(i) { return  `Markdown for post ${i}.`; },
    html(i) { return  `HTML for post ${i}.`; },
    image(i) { return  `/content/images/2015/10/post-${i}.jpg`; },
    featured() { return  false; },
    page() { return  false; },
    status(i) { return  `/content/images/2015/10/post-${i}.jpg`; },
    meta_description(i) { return  `Meta description for post ${i}.`; },
    meta_title(i) { return  `Meta Title for post ${i}`; },
    author_id() { return  1; },
    updated_at() { return  '2015-10-19T16:25:07.756Z'; },
    updated_by() { return  1; },
    published_at() { return  '2015-10-19T16:25:07.756Z'; },
    published_by() { return  1; },
    created_at() { return  '2015-09-11T09:44:29.871Z'; },
    created_by() { return  1; }
});
