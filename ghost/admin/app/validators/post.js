import BaseValidator from './base';
import moment from 'moment';
import {isEmpty, isPresent} from '@ember/utils';

export default BaseValidator.create({
    properties: [
        'title',
        'customExcerpt',
        'codeinjectionHead',
        'codeinjectionFoot',
        'metaTitle',
        'metaDescription',
        'ogtitle',
        'ogDescription',
        'twitterTitle',
        'twitterDescription',
        'publishedAtBlogTime',
        'publishedAtBlogDate'
    ],

    title(model) {
        let title = model.get('title');

        if (validator.empty(title)) {
            model.get('errors').add('title', 'You must specify a title for the post.');
            this.invalidate();
        }

        if (!validator.isLength(title, 0, 255)) {
            model.get('errors').add('title', 'Title cannot be longer than 255 characters.');
            this.invalidate();
        }
    },

    customExcerpt(model) {
        let customExcerpt = model.get('customExcerpt');

        if (!validator.isLength(customExcerpt, 0, 300)) {
            model.get('errors').add('customExcerpt', 'Excerpt cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    codeinjectionFoot(model) {
        let codeinjectionFoot = model.get('codeinjectionFoot');

        if (!validator.isLength(codeinjectionFoot, 0, 65535)) {
            model.get('errors').add('codeinjectionFoot', 'Footer code cannot be longer than 65535 characters.');
            this.invalidate();
        }
    },

    codeinjectionHead(model) {
        let codeinjectionHead = model.get('codeinjectionHead');

        if (!validator.isLength(codeinjectionHead, 0, 65535)) {
            model.get('errors').add('codeinjectionHead', 'Header code cannot be longer than 65535 characters.');
            this.invalidate();
        }
    },

    metaTitle(model) {
        let metaTitle = model.get('metaTitle');

        if (!validator.isLength(metaTitle, 0, 300)) {
            model.get('errors').add('metaTitle', 'Meta Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    metaDescription(model) {
        let metaDescription = model.get('metaDescription');

        if (!validator.isLength(metaDescription, 0, 500)) {
            model.get('errors').add('metaDescription', 'Meta Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    ogTitle(model) {
        let ogTitle = model.get('ogTitle');

        if (!validator.isLength(ogTitle, 0, 300)) {
            model.get('errors').add('ogTitle', 'Facebook Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    ogDescription(model) {
        let ogDescription = model.get('ogDescription');

        if (!validator.isLength(ogDescription, 0, 500)) {
            model.get('errors').add('ogDescription', 'Facebook Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    twitterTitle(model) {
        let twitterTitle = model.get('twitterTitle');

        if (!validator.isLength(twitterTitle, 0, 300)) {
            model.get('errors').add('twitterTitle', 'Twitter Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    twitterDescription(model) {
        let twitterDescription = model.get('twitterDescription');

        if (!validator.isLength(twitterDescription, 0, 500)) {
            model.get('errors').add('twitterDescription', 'Twitter Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },
    // for posts which haven't been published before and where the blog date/time
    // is blank we should ignore the validation
    _shouldValidatePublishedAtBlog(model) {
        let publishedAtUTC = model.get('publishedAtUTC');
        let publishedAtBlogDate = model.get('publishedAtBlogDate');
        let publishedAtBlogTime = model.get('publishedAtBlogTime');

        return isPresent(publishedAtUTC)
            || isPresent(publishedAtBlogDate)
            || isPresent(publishedAtBlogTime);
    },

    // convenience method as .validate({property: 'x'}) doesn't accept multiple properties
    publishedAtBlog(model) {
        this.publishedAtBlogTime(model);
        this.publishedAtBlogDate(model);
    },

    publishedAtBlogTime(model) {
        let publishedAtBlogTime = model.get('publishedAtBlogTime');
        let timeRegex = /^(([0-1]?[0-9])|([2][0-3])):([0-5][0-9])$/;

        if (!timeRegex.test(publishedAtBlogTime) && this._shouldValidatePublishedAtBlog(model)) {
            model.get('errors').add('publishedAtBlogTime', 'Must be in format: "15:00"');
            this.invalidate();
        }
    },

    publishedAtBlogDate(model) {
        let publishedAtBlogDate = model.get('publishedAtBlogDate');
        let publishedAtBlogTime = model.get('publishedAtBlogTime');

        if (!this._shouldValidatePublishedAtBlog(model)) {
            return;
        }

        // we have a time string but no date string
        if (validator.empty(publishedAtBlogDate) && !validator.empty(publishedAtBlogTime)) {
            model.get('errors').add('publishedAtBlogDate', 'Can\'t be blank');
            return this.invalidate();
        }

        // don't validate the date if the time format is incorrect
        if (isEmpty(model.get('errors').errorsFor('publishedAtBlogTime'))) {
            let status = model.get('statusScratch') || model.get('status');
            let now = moment();
            let publishedAtUTC = model.get('publishedAtUTC');
            let publishedAtBlogTZ = model.get('publishedAtBlogTZ');
            let matchesExisting = publishedAtUTC && publishedAtBlogTZ.isSame(publishedAtUTC);
            let isInFuture = publishedAtBlogTZ.isSameOrAfter(now.add(2, 'minutes'));

            // draft/published must be in past
            if ((status === 'draft' || status === 'published') && publishedAtBlogTZ.isSameOrAfter(now)) {
                model.get('errors').add('publishedAtBlogDate', 'Must be in the past');
                this.invalidate();

            // scheduled must be at least 2 mins in the future
            // ignore if it matches publishedAtUTC as that is likely an update of a scheduled post
            } else if (status === 'scheduled' && !matchesExisting && !isInFuture) {
                model.get('errors').add('publishedAtBlogDate', 'Must be at least 2 mins in the future');
                this.invalidate();
            }
        }
    }
});
