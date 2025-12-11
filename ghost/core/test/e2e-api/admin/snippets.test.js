require('should');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyLocationFor, anyObjectId, anyISODateTime, anyErrorId} = matchers;
const config = require('../../../core/shared/config');

const matchSnippet = {
    id: anyObjectId,
    created_at: anyISODateTime,
    updated_at: anyISODateTime
};

describe('Snippets API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('snippets');
        await agent.loginAsOwner();
    });

    it('Can add', async function () {
        const snippet = {
            name: 'test',
            mobiledoc: JSON.stringify({})
        };

        await agent
            .post('snippets/')
            .body({snippets: [snippet]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });
    });

    it('Can browse', async function () {
        await agent
            .get('snippets')
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: new Array(4).fill(matchSnippet)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can read', async function () {
        await agent
            .get(`snippets/${fixtureManager.get('snippets', 0).id}/`)
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can read lexical', async function () {
        await agent
            .get(`snippets/${fixtureManager.get('snippets', 0).id}/?formats=lexical`)
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can edit', async function () {
        const snippetToChange = {
            name: 'change me',
            mobiledoc: '{}'
        };

        const snippetChanged = {
            name: 'changed',
            mobiledoc: '{}'
        };

        const {body} = await agent
            .post(`snippets/`)
            .body({snippets: [snippetToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });

        const newsnippet = body.snippets[0];

        await agent
            .put(`snippets/${newsnippet.id}/`)
            .body({snippets: [snippetChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can destroy', async function () {
        const snippet = {
            name: 'destroy test',
            mobiledoc: '{}'
        };

        const {body} = await agent
            .post(`snippets/`)
            .body({snippets: [snippet]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });

        const newSnippet = body.snippets[0];

        await agent
            .delete(`snippets/${newSnippet.id}`)
            .expectStatus(204)
            .expectEmptyBody()
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });

        await agent
            .get(`snippets/${newSnippet.id}/`)
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Cannot destroy non-existent snippet', async function () {
        await agent
            .delete('snippets/abcd1234abcd1234abcd1234')
            .expectStatus(404)
            .matchBodySnapshot({
                errors: [{
                    id: anyErrorId
                }]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can add lexical', async function () {
        const snippet = {
            name: 'test lexical',
            lexical: JSON.stringify({node: 'text'}),
            mobiledoc: '{}'
        };

        await agent
            .post('snippets/?formats=lexical')
            .body({snippets: [snippet]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });
    });

    it('Can browse lexical', async function () {
        await agent
            .get('snippets?formats=lexical&filter=lexical:-null')
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: new Array(2).fill(matchSnippet)
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    it('Can edit lexical', async function () {
        const snippetToChange = {
            name: 'change me',
            mobiledoc: '{}',
            lexical: '{}'
        };

        const snippetChanged = {
            name: 'changed lexical',
            mobiledoc: '{}',
            lexical: JSON.stringify({node: 'text'})
        };

        const {body} = await agent
            .post(`snippets/?formats=lexical`)
            .body({snippets: [snippetToChange]})
            .expectStatus(201)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag,
                location: anyLocationFor('snippets')
            });

        const newsnippet = body.snippets[0];

        await agent
            .put(`snippets/${newsnippet.id}/?formats=lexical`)
            .body({snippets: [snippetChanged]})
            .expectStatus(200)
            .matchBodySnapshot({
                snippets: [matchSnippet]
            })
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            });
    });

    describe('URL transformations', function () {
        const siteUrl = config.get('url');

        it('Can read Mobiledoc snippet with all URLs as absolute site URLs', async function () {
            const res = await agent
                .get('snippets/?formats=mobiledoc&filter=name:\'Snippet with all media types - Mobiledoc\'')
                .expectStatus(200);

            const snippet = res.body.snippets[0];
            const mobiledoc = JSON.parse(snippet.mobiledoc);

            mobiledoc.cards.find(c => c[0] === 'image')[1].src.should.equal(`${siteUrl}/content/images/snippet-inline.jpg`);
            mobiledoc.cards.find(c => c[0] === 'file')[1].src.should.equal(`${siteUrl}/content/files/snippet-document.pdf`);
            mobiledoc.cards.find(c => c[0] === 'video')[1].src.should.equal(`${siteUrl}/content/media/snippet-video.mp4`);
            mobiledoc.cards.find(c => c[0] === 'audio')[1].src.should.equal(`${siteUrl}/content/media/snippet-audio.mp3`);
            snippet.mobiledoc.should.not.containEql('__GHOST_URL__');
        });

        it('Can read Lexical snippet with all URLs as absolute site URLs', async function () {
            const res = await agent
                .get('snippets/?formats=lexical&filter=name:\'Snippet with all media types - Lexical\'')
                .expectStatus(200);

            const snippet = res.body.snippets[0];

            snippet.lexical.should.containEql(`${siteUrl}/content/images/snippet-inline.jpg`);
            snippet.lexical.should.containEql(`${siteUrl}/content/files/snippet-document.pdf`);
            snippet.lexical.should.containEql(`${siteUrl}/content/media/snippet-video.mp4`);
            snippet.lexical.should.containEql(`${siteUrl}/content/media/snippet-audio.mp3`);
            snippet.lexical.should.not.containEql('__GHOST_URL__');
        });
    });
});
