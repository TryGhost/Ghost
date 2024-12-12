import BaseValidator from './base';
import moment from 'moment-timezone';
import validator from 'validator';
import {isBlank, isEmpty, isPresent} from '@ember/utils';

export default BaseValidator.create({
    properties: [
        'title',
        'authors',
        'customExcerpt',
        'canonicalUrl',
        'codeinjectionHead',
        'codeinjectionFoot',
        'metaTitle',
        'metaDescription',
        'ogtitle',
        'ogDescription',
        'twitterTitle',
        'twitterDescription',
        'publishedAtBlogTime',
        'publishedAtBlogDate',
        'emailSubject',
        'featureImageAlt'
    ],

    title(model) {
        if (isBlank(model.title)) {
            model.errors.add('title', 'You must specify a title for the post.');
            this.invalidate();
        }

        if (!validator.isLength(model.title || '', 0, 255)) {
            model.errors.add('title', 'Title cannot be longer than 255 characters.');
            this.invalidate();
        }
    },

    authors(model) {
        if (isEmpty(model.authors)) {
            model.errors.add('authors', 'At least one author is required.');
            this.invalidate();
        }
    },

    canonicalUrl(model) {
        let validatorOptions = {require_protocol: true};
        let urlRegex = new RegExp(/^(\/|[a-zA-Z0-9-]+:)/);
        let url = model.canonicalUrl;

        if (isBlank(url)) {
            return;
        }

        if (url.match(/\s/) || (!validator.isURL(url, validatorOptions) && !url.match(urlRegex))) {
            model.errors.add('canonicalUrl', 'Please enter a valid URL');
            this.invalidate();
        } else if (!validator.isLength(model.canonicalUrl, 0, 2000)) {
            model.errors.add('canonicalUrl', 'Canonical URL is too long, max 2000 chars');
            this.invalidate();
        }
    },

    customExcerpt(model) {
        if (!validator.isLength(model.customExcerpt || '', 0, 300)) {
            const errorMessage = 'Excerpt cannot be longer than 300 characters.';
            model.errors.add('customExcerpt', errorMessage);
            this.invalidate();
        } else {
            model.errors.remove('customExcerpt');
        }
    },

    visibility(model) {
        if (isBlank(model.visibility) && !model.isNew) {
            model.errors.add('visibility', 'Please select at least one tier');
            this.invalidate();
        }
    },

    tiers(model) {
        if (model.visibility === 'tiers' && !model.isNew && isEmpty(model.tiers)) {
            model.errors.add('tiers', 'Please select at least one tier');
            this.invalidate();
        }
    },

    codeinjectionFoot(model) {
        if (!validator.isLength(model.codeinjectionFoot || '', 0, 65535)) {
            model.errors.add('codeinjectionFoot', 'Footer code cannot be longer than 65535 characters.');
            this.invalidate();
        }
    },

    codeinjectionHead(model) {
        if (!validator.isLength(model.codeinjectionHead || '', 0, 65535)) {
            model.errors.add('codeinjectionHead', 'Header code cannot be longer than 65535 characters.');
            this.invalidate();
        }
    },

    metaTitle(model) {
        if (!validator.isLength(model.metaTitle || '', 0, 300)) {
            model.errors.add('metaTitle', 'Meta Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    metaDescription(model) {
        if (!validator.isLength(model.metaDescription || '', 0, 500)) {
            model.errors.add('metaDescription', 'Meta Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    ogTitle(model) {
        if (!validator.isLength(model.ogTitle || '', 0, 300)) {
            model.errors.add('ogTitle', 'Facebook Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    ogDescription(model) {
        if (!validator.isLength(model.ogDescription || '', 0, 500)) {
            model.errors.add('ogDescription', 'Facebook Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    twitterTitle(model) {
        if (!validator.isLength(model.twitterTitle || '', 0, 300)) {
            model.errors.add('twitterTitle', 'Twitter Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    twitterDescription(model) {
        if (!validator.isLength(model.twitterDescription || '', 0, 500)) {
            model.errors.add('twitterDescription', 'Twitter Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    emailSubject(model) {
        if (!validator.isLength(model.emailSubject || '', 0, 300)) {
            model.errors.add('emailSubject', 'Email Subject cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    // for posts which haven't been published before and where the blog date/time
    // is blank we should ignore the validation
    _shouldValidatePublishedAtBlog(model) {
        return isPresent(model.publishedAtUTC)
            || isPresent(model.publishedAtBlogDate)
            || isPresent(model.publishedAtBlogTime);
    },

    // convenience method as .validate({property: 'x'}) doesn't accept multiple properties
    publishedAtBlog(model) {
        this.publishedAtBlogTime(model);
        this.publishedAtBlogDate(model);
    },

    publishedAtBlogTime(model) {
        let timeRegex = /^(([0-1]?[0-9])|([2][0-3])):([0-5][0-9])$/;

        if (!timeRegex.test(model.publishedAtBlogTime) && this._shouldValidatePublishedAtBlog(model)) {
            model.errors.add('publishedAtBlogTime', 'Must be in format: "15:00"');
            this.invalidate();
        }
    },

    publishedAtBlogDate(model) {
        let publishedAtBlogDate = model.publishedAtBlogDate;
        let publishedAtBlogTime = model.publishedAtBlogTime;

        if (!this._shouldValidatePublishedAtBlog(model)) {
            return;
        }

        // we have a time string but no date string
        if (isBlank(publishedAtBlogDate) && !isBlank(publishedAtBlogTime)) {
            model.errors.add('publishedAtBlogDate', 'Can\'t be blank');
            return this.invalidate();
        }

        // don't validate the date if the time format is incorrect
        if (isEmpty(model.errors.errorsFor('publishedAtBlogTime'))) {
            let status = model.status;
            let now = moment();
            let publishedAtBlogTZ = model.publishedAtBlogTZ;
            let isInFuture = publishedAtBlogTZ.isSameOrAfter(now);

            // draft/published must be in past
            if ((status === 'draft' || status === 'published') && publishedAtBlogTZ.isSameOrAfter(now)) {
                model.errors.add('publishedAtBlogDate', 'Please choose a past date and time.');
                this.invalidate();

            // scheduled must be in the future when first scheduling
            } else if ((model.changedAttributes().status || model.changedAttributes().publishedAtUTC) && status === 'scheduled' && !isInFuture) {
                model.errors.add('publishedAtBlogDate', 'Please choose a future date and time.');
                this.invalidate();
            }
        }
    },

    featureImageAlt(model) {
        if (!validator.isLength(model.featureImageAlt || '', 0, 125)) {
            model.errors.add('featureImageAlt', 'Feature image alt text cannot be longer than 125 characters.');
            this.invalidate();
        }
    }
});
