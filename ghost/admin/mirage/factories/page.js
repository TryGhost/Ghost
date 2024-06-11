import {Factory} from 'miragejs';
import {isEmpty} from '@ember/utils';

export default Factory.extend({
    codeinjectionFoot: null,
    codeinjectionHead: null,
    createdAt: '2015-09-11T09:44:29.871Z',
    createdBy: 1,
    customExcerpt: null,
    customTemplate: null,
    description(i) { return `Title for page ${i}.`; },
    featured: false,
    featureImage(i) { return `/content/images/2015/10/page-${i}.jpg`; },
    html(i) { return `<p>HTML for page ${i}.</p>`; },
    visibility: 'public',
    metaDescription(i) { return `Meta description for page ${i}.`; },
    metaTitle(i) { return `Meta Title for page ${i}`; },
    ogDescription: null,
    ogImage: null,
    ogTitle: null,
    excerpt(i) { return `Excerpt for page ${i}.`; },
    plaintext(i) { return `Plaintext for page ${i}.`; },
    publishedAt: '2015-12-19T16:25:07.000Z',
    publishedBy: 1,
    status(i) {
        let statuses = ['draft', 'published', 'scheduled'];
        return statuses[i % statuses.length];
    },
    title(i) { return `Page ${i}`; },
    twitterDescription: null,
    twitterImage: null,
    twitterTitle: null,
    emailSubject: null,
    updatedAt: '2015-10-19T16:25:07.756Z',
    updatedBy: 1,
    uuid(i) { return `page-${i}`; },

    authors() { return []; },
    tags() { return []; },

    afterCreate(page, server) {
        if (isEmpty(page.authors)) {
            let user = server.schema.users.find(1);

            if (!user) {
                let role = server.schema.roles.find({name: 'Administrator'}) || server.create('role', {name: 'Administrator'});
                user = server.create('user', {roles: [role]});
            }

            page.authors = [user];
            page.save();
        }
    }
});
