const BaseMapGenerator = require('./base-site-map-generator');

class PageMapGenerator extends BaseMapGenerator {
  constructor(opts) {
    super();

    this.name = 'pages';

    Object.assign(this, opts);
  }
}

module.exports = PageMapGenerator;
