import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {
    EMPTY_DOC,
    testEditorInput,
    testEditorInputTimeout
} from '../../helpers/editor-helpers';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';

describe('gh-koenig: Integration: Component: gh-koenig', function () {
    setupComponentTest('gh-koenig', {
        integration: true
    });

    beforeEach(function () {
        this.set('value', EMPTY_DOC);
    });

    it('fires change and word-count events', async function () {
        // set defaults
        this.set('onFirstChange', sinon.spy());
        this.set('onChange', sinon.spy());

        this.set('wordcount', 0);
        this.set('actions.wordcountDidChange', function (wordcount) {
            this.set('wordcount', wordcount);
        });

        this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                                onChange=(action onChange)
                                onFirstChange=(action onFirstChange)
                                wordcountDidChange=(action 'wordcountDidChange')
                            }}`);

        await testEditorInput('abcd efg hijk lmnop', '<p>abcd efg hijk lmnop</p>', expect);

        expect(this.get('onFirstChange').calledOnce, 'onFirstChanged called once').to.be.true;
        expect(this.get('onChange').called, 'onChange called').to.be.true;
        expect(this.get('wordcount'), 'wordcount').to.equal(4);
    });

    describe('Markerable markdown support.', function () {
        it('plain text inputs (placebo)', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('abcdef', '<p>abcdef</p>', expect);
        });

        // bold
        it('** bolds at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('**test**', '<p><strong>test</strong></p>', expect);
        });

        it('** bolds in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('123**test**', '<p>123<strong>test</strong></p>', expect);
        });

        it('__ bolds at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('__test__', '<p><strong>test</strong></p>', expect);
        });

        it('__ bolds in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('__test__', '<p><strong>test</strong></p>', expect);
        });

        // italic
        it('* italicises at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('*test*', '<p><em>test</em></p>', expect);
        });

        it('* italicises in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('123*test*', '<p>123<em>test</em></p>', expect);
        });

        it('_ italicises at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('_test_', '<p><em>test</em></p>', expect);
        });

        it('_ italicises in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('123_test_', '<p>123<em>test</em></p>', expect);
        });

        // strikethrough
        it('~~ strikethroughs at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('~~test~~', '<p><s>test</s></p>', expect);
        });
        it('~~ strikethroughs in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('123~~test~~', '<p>123<s>test</s></p>', expect);
        });

        // links
        it('[]() creates a link at start of line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput(
                '[ghost](https://www.ghost.org/)',
                '<p><a href="https://www.ghost.org/">ghost</a></p>',
                expect);
        });

        it('[]() creates a link in a line', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput(
                '123[ghost](https://www.ghost.org/)',
                '<p>123<a href="https://www.ghost.org/">ghost</a></p>',
                expect);
        });
    });

    describe('Block markdown support', function () {
        // headings
        it('# creates an H1', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('# ', '<h1><br></h1>', expect);
        });

        it('## creates an H2', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('## ', '<h2><br></h2>', expect);
        });

        it('### creates an H3', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('### ', '<h3><br></h3>', expect);
        });

        // lists
        it('* creates an UL', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('* ', '<ul><li><br></li></ul>', expect);
        });

        it('- creates an UL', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('- ', '<ul><li><br></li></ul>', expect);
        });

        it('1. creates an OL', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('1. ', '<ol><li><br></li></ol>', expect);
        });

        // quote
        it('> creates an blockquote', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            await testEditorInput('> ', '<blockquote><br></blockquote>', expect);
        });
    });

    describe('Card markdown support.', function () {
        it('![]() creates an image card', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            let value = await testEditorInputTimeout('![image of something](https://unsplash.it/200/300/?random)');
            expect(value).to.have.string('kg-card-image');
        });

        it('``` creates a markdown card.', async function () {
            this.render(hbs`{{gh-koenig
                                apiRoot='/todo'
                                assetPath='/assets'
                                containerSelector='.gh-koenig-container'
                                mobiledoc=value
                            }}`);

            let value = await testEditorInputTimeout('```some code```');
            expect(value).to.have.string('kg-card-markdown');
        });
    });
});
