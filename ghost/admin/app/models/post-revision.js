import Model, {attr, belongsTo} from '@ember-data/model';

export default class PostRevisionModel extends Model {
  @belongsTo('post') post;
  @attr('string') lexical;
  @attr('string') title;
  @attr('string') featureImage;
  @attr('moment-utc') createdAt;
  @belongsTo('user') author;
}
