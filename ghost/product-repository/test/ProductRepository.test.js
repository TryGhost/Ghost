const should = require('should');
const ProductRepository = require('../ProductRepository');

describe('ProductRespository', function () {
    it('Has create, update, get, list, destroy method', function () {
        should.exist(ProductRepository.prototype.create);
        should.exist(ProductRepository.prototype.update);
        should.exist(ProductRepository.prototype.get);
        should.exist(ProductRepository.prototype.list);
        should.exist(ProductRepository.prototype.destroy);
    });
});
