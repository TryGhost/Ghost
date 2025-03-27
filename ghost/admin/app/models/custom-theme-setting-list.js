import Model, {hasMany} from '@ember-data/model';

export default Model.extend({
    customThemeSettings: hasMany('custom-theme-setting')
});
