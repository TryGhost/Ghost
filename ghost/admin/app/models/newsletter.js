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
    @attr({defaultValue: ''}) recipientFilter;
    @attr({defaultValue: false}) subscribeOnSignup;
    @attr({defaultValue: 0}) sortOrder;

    // Design-related properties - TODO: not currently supported in API
    @attr headerImage;
    @attr({defaultValue: true}) showHeaderIcon;
    @attr({defaultValue: true}) showHeaderTitle;
    @attr({defaultValue: 'sans_serif'}) titleFontCategory;
    @attr({defaultValue: 'center'}) titleAlignment;
    @attr({defaultValue: true}) showFeatureImage;
    @attr({defaultValue: 'sans_serif'}) bodyFontCategory;
    @attr() footerContent;
    @attr({defaultValue: true}) showBadge;
}
