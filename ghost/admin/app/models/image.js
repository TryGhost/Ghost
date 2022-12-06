import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    image: attr('string'),
    caption: attr('string'),
    width: attr('number'),
    height: attr('number'),
});
