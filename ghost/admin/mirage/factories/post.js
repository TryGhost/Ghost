import {Factory, faker} from 'ember-cli-mirage';

export default Factory.extend({
    uuid(i) { return `post-${i}`; },
    title(i) { return `Post ${i}`; },
    description(i) { return `Title for post ${i}.`; },
    slug(i) { return `post-${i}`; },
    html(i) { return `<p>HTML for post ${i}.</p>`; },
    plaintext(i) { return `Plaintext for post ${i}.`; },
    featureImage(i) { return `/content/images/2015/10/post-${i}.jpg`; },
    featured: false,
    page: false,
    status(i) { return faker.list.cycle('draft', 'published', 'scheduled')(i); },
    metaDescription(i) { return `Meta description for post ${i}.`; },
    metaTitle(i) { return `Meta Title for post ${i}`; },
    authorId: 1,
    updatedAt: '2015-10-19T16:25:07.756Z',
    updatedBy: 1,
    publishedAt: '2015-12-19T16:25:07.000Z',
    publishedBy: 1,
    createdAt: '2015-09-11T09:44:29.871Z',
    createdBy: 1,
    tags() { return []; }
});
