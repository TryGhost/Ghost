import Model, {attr} from '@ember-data/model';

// @todo this is a temporary model until we have the api / db model structure figured out
export default Model.extend({
    source: attr('string'),
    target: attr('string'),
    timestamp: attr('date'),
    resourceId: attr('string', {allowNull: true}),
    sourceTitle: attr('string'),
    sourceSiteTitle: attr('string'),
    sourceAuthor: attr('string'),
    sourceExcerpt: attr('string'),
    sourceFavicon: attr('string'),
    sourceFeaturedImage: attr('string'),
    payload: attr(),
    mentions: attr() // @todo this is a temporary field until we have the api / db model structure figured out
});
