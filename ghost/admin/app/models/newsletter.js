import Model, {attr} from '@ember-data/model';
import ValidationEngine from '../mixins/validation-engine';

export default class Newsletter extends Model.extend(ValidationEngine) {
    validationType = 'newsletter';

    @attr name;
    @attr slug;
    @attr description;

    @attr senderName;
    @attr senderEmail;
    @attr({defaultValue: 'newsletter'}) senderReplyTo;

    @attr({defaultValue: 'active'}) status;
    @attr({defaultValue: true}) subscribeOnSignup;
    @attr({defaultValue: 'members'}) visibility;
    @attr({defaultValue: 0}) sortOrder;
    @attr({defaultValue: true}) feedbackEnabled;

    // Design-related properties
    @attr headerImage;
    @attr({defaultValue: true}) showHeaderIcon;
    @attr({defaultValue: true}) showHeaderTitle;
    @attr({defaultValue: true}) showHeaderName;
    @attr({defaultValue: true}) showPostTitleSection;
    @attr({defaultValue: false}) showExcerpt;
    @attr({defaultValue: true}) showCommentCta;
    @attr({defaultValue: false}) showSubscriptionDetails;
    @attr({defaultValue: false}) showLatestPosts;
    @attr({defaultValue: 'sans_serif'}) titleFontCategory;
    @attr({defaultValue: 'center'}) titleAlignment;
    @attr({defaultValue: true}) showFeatureImage;
    @attr({defaultValue: 'sans_serif'}) bodyFontCategory;
    @attr({defaultValue: 'light'}) backgroundColor;
    @attr({defaultValue: null}) borderColor;
    @attr({defaultValue: null}) titleColor;
    @attr footerContent;
    @attr({defaultValue: true}) showBadge;
    @attr count;

    // HACK - not a real model attribute but a workaround for Ember Data not
    //        exposing meta from save responses
    @attr _meta;

    /**
     * The filter that we should use to filter out members that are actively subscribed to this newsletter
     */
    get recipientFilter() {
        const filter = [`newsletters.slug:${this.slug}`, 'email_disabled:0'];
        if (this.visibility === 'paid') {
            filter.push('status:-free');
        }
        return filter.join('+');
    }
}
