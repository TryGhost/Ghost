const BaseMapGenerator = require('./base-site-map-generator');

class TagsMapGenerator extends BaseMapGenerator {
  constructor(opts) {
    super();

    this.name = 'tags';
    Object.assign(this, opts);
  }
}

module.exports = TagsMapGenerator;
