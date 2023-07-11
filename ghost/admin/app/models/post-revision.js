import Model, {attr, belongsTo} from '@ember-data/model';

export default class PostRevisionModel extends Model {
  @attr('string') lexical;
  @attr('string') title;
  @attr('string') featureImage;
  @attr('string') featureImageAlt;
  @attr('string') featureImageCaption;
  @attr('string') reason;
  @attr('moment-utc') createdAt;
  @belongsTo('user') author;
  @attr('string') postStatus;
}
