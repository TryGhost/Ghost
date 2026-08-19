import assert from 'node:assert/strict';
import {postImportRowSchema} from '../../../../../../core/server/services/content-import/import/row';

// The schema is where the raw string cells the CSV reader emits become typed post
// fields. Coercion rules live here so the importer reads precise values without
// re-checking them.
describe('post import row schema', function () {
    it('trims the title, because the model skips its own trim when importing', function () {
        assert.equal(postImportRowSchema.parse({title: '  Padded  '}).title, 'Padded');
        assert.equal(postImportRowSchema.parse({title: '   '}).title, '');
    });

    it('defaults a missing title to the empty string rather than undefined', function () {
        assert.equal(postImportRowSchema.parse({}).title, '');
    });

    it('defaults a missing html cell to the empty string', function () {
        assert.equal(postImportRowSchema.parse({}).html, '');
        assert.equal(postImportRowSchema.parse({html: '<p>Hi</p>'}).html, '<p>Hi</p>');
    });

    it('reads an empty (or literally "undefined") published_at cell as absent', function () {
        assert.equal(postImportRowSchema.parse({published_at: ''}).published_at, undefined);
        assert.equal(postImportRowSchema.parse({published_at: 'undefined'}).published_at, undefined);
        assert.equal(postImportRowSchema.parse({published_at: '2025-01-01T00:00:00.000Z'}).published_at, '2025-01-01T00:00:00.000Z');
    });

    it('passes unknown columns through for later milestones to consume', function () {
        const parsed = postImportRowSchema.parse({title: 'T', custom_thing: 'kept'});
        assert.equal(parsed.custom_thing, 'kept');
    });
});
