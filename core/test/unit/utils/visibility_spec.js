var should = require('should'), /* jshint ignore:line */

    visibility = require('../../../server/utils/visibility');

describe('Visibility', function () {
    var arrayHash, objectHash;

    beforeEach(function () {
        arrayHash = [
            {name: 'zeroth', visibility: 'internal'},
            {name: 'first', visibility: 'public'},
            {name: 'second', visibility: 'public'},
            {name: 'third', visibility: 'internal'},
            {name: 'fourth', visibility: 'public'},
            {name: 'fifth'}
        ];
        objectHash = {
            zeroth: {name: 'zeroth', visibility: 'internal'},
            first: {name: 'first', visibility: 'public'},
            second: {name: 'second', visibility: 'public'},
            third: {name: 'third', visibility: 'internal'},
            fourth: {name: 'fourth', visibility: 'public'},
            fifth: {name: 'fifth'}
        };
    });

    describe('filter', function () {
        // TODO: add tests here, currently this is covered by server_helpers/tag_spec.js and foreach_spec.js
    });

    describe('first', function () {
        it('Returns first matching item for object with public', function () {
            var result = visibility.first(arrayHash, ['public']);

            result.should.eql({name: 'first', visibility: 'public'});
        });

        it('Returns first matching item for array  with public', function () {
            var result = visibility.first(objectHash, ['public']);

            result.should.eql({name: 'first', visibility: 'public'});
        });

        it('Returns first matching item for array with all', function () {
            var result = visibility.first(arrayHash, ['all']);

            result.should.eql({name: 'zeroth', visibility: 'internal'});
        });

        it('Returns first matching item for object with all', function () {
            var result = visibility.first(objectHash, ['all']);

            result.should.eql({name: 'zeroth', visibility: 'internal'});
        });

        it('Returns first matching item for array requiring explicit', function () {
            arrayHash = [{name: 'zeroth'}, {name: 'first', visibility: 'public'}];

            var result = visibility.first(arrayHash, ['public'], true);

            result.should.eql({name: 'first', visibility: 'public'});
        });

        it('Returns first matching item for objecr requiring explicit', function () {
            objectHash = {zeroth: {name: 'zeroth'}, first: {name: 'first', visibility: 'public'}};

            var result = visibility.first(objectHash, ['public'], true);

            result.should.eql({name: 'first', visibility: 'public'});
        });
    });

    describe('parser', function () {
        it('Returns public array if there are no options', function () {
            visibility.parser().should.eql(['public']);
        });

        it('Returns public array if there is no hash', function () {
            visibility.parser({}).should.eql(['public']);
        });

        it('Returns public array if there is no visibility set', function () {
            visibility.parser({hash: {}}).should.eql(['public']);
        });

        it('Returns correct array when visibility is set to public', function () {
            visibility.parser({hash: {visibility: 'public'}}).should.eql(['public']);
        });

        it('Returns correct array when visibility is set to all', function () {
            visibility.parser({hash: {visibility: 'all'}}).should.eql(['all']);
        });
    });
});
