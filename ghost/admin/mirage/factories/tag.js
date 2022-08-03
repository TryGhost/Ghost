import {Factory} from 'miragejs';

export default Factory.extend({
    createdAt: '2015-09-11T09:44:29.871Z',
    createdBy: 1,
    description(i) { return `Description for tag ${i}.`; },
    visibility: 'public',
    featureImage(i) { return `/content/images/2015/10/tag-${i}.jpg`; },
    metaDescription(i) { return `Meta description for tag ${i}.`; },
    metaTitle(i) { return `Meta Title for tag ${i}`; },
    name(i) { return `Tag ${i}`; },
    parent: null,
    slug(i) { return `tag-${i}`; },
    updatedAt: '2015-10-19T16:25:07.756Z',
    updatedBy: 1,
    count() {
        // this gets updated automatically by the tag serializer
        return {posts: 0};
    }
});
