import {Snippet} from '../../../core/snippets/snippet.entity';
import ObjectId from 'bson-objectid';
import assert from 'assert/strict';
import {SnippetDTO} from './snippet.dto';

describe('BrowseSnippetDTO', () => {
    it('constructs a BrowseSnippetDTO object from a Snippet object with mobiledoc field', async () => {
        const snippet = new Snippet({
            id: ObjectId(),
            deleted: false,
            name: 'Test',
            mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Test"]]]]}',
            lexical: undefined,
            createdAt: new Date(),
            updatedAt: null,
            createdBy: ObjectId(),
            updatedBy: null
        });

        const browseSnippetDTO = new SnippetDTO(snippet, {formats: 'mobiledoc'});

        assert(browseSnippetDTO, 'BrowseSnippetDTO object is not null');
        assert.equal(browseSnippetDTO.id, snippet.id.toString());
        assert.equal(browseSnippetDTO.name, snippet.name);
        assert.equal(browseSnippetDTO.mobiledoc, snippet.mobiledoc);
        assert.equal(browseSnippetDTO.lexical, undefined);
    });

    it('constructs a BrowseSnippetDTO object from a Snippet object with lexical field', async () => {
        const snippet = new Snippet({
            deleted: false,
            id: ObjectId(),
            name: 'Test',
            mobiledoc: undefined,
            lexical: `{"root":{"children":[{"type":"html","version":1,"html":"<p>hey!</p>"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`,
            createdAt: new Date(),
            updatedAt: null,
            createdBy: ObjectId(),
            updatedBy: null
        });

        const browseSnippetDTO = new SnippetDTO(snippet, {formats: 'lexical'});

        assert(browseSnippetDTO, 'BrowseSnippetDTO object is not null');
        assert.equal(browseSnippetDTO.id, snippet.id.toString());
        assert.equal(browseSnippetDTO.name, snippet.name);
        assert.equal(browseSnippetDTO.mobiledoc, undefined);
        assert.equal(browseSnippetDTO.lexical, snippet.lexical);
    });
});
