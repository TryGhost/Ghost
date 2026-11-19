const BaseMapGenerator = require('./base-site-map-generator');

class PostMapGenerator extends BaseMapGenerator {
  constructor(opts) {
    super();

    this.name = 'posts';

    Object.assign(this, opts);
  }
}

module.exports = PostMapGenerator;
