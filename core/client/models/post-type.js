import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';
import SelectiveSaveMixin from 'ghost/mixins/selective-save';

var PostType = DS.Model.extend(NProgressSaveMixin, SelectiveSaveMixin, ValidationEngine, {
    validationType: 'postType',

    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    desc: DS.attr('string')


});

export default PostType;
