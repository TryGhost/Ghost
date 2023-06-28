import assert from 'assert/strict';
import {CollectionsRepositoryInMemory} from '../src/CollectionsRepositoryInMemory';
import {Collection} from '../src/Collection';
import {RepositoryUniqueChecker} from '../src/RepositoryUniqueChecker';

describe('RepositoryUniqueChecker', function () {
    let uniqueChecker: RepositoryUniqueChecker;

    beforeEach(async function () {
        const repository = new CollectionsRepositoryInMemory();
        const collection = await Collection.create({
            title: 'Test',
            slug: 'not-unique'
        });
        repository.save(collection);
        uniqueChecker = new RepositoryUniqueChecker(repository);
    });

    it('should return true if slug is unique', async function () {
        const actual = await uniqueChecker.isUniqueSlug('unique');
        const expected = true;

        assert.equal(actual, expected, 'The slug "unique" should be unique');
    });

    it('should return false if slug is not unique', async function () {
        const actual = await uniqueChecker.isUniqueSlug('not-unique');
        const expected = false;

        assert.equal(actual, expected, 'The slug "not-unique" should not be unique');
    });
});
