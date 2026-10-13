import assert from 'node:assert/strict';
import {assertPrettifiesTo, callRenderer, html} from '../test-utils/index.js';

describe('renderers/email-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            html: '<p>Hello World</p>',
            ...overrides
        };
    }

    function renderForWeb(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('email', data, options);
    }

    function renderForEmail(data: Record<string, unknown>, options?: Record<string, unknown>) {
        return callRenderer('email', data, {...options, target: 'email'});
    }

    describe('web', function () {
        it('renders nothing', function () {
            const result = renderForWeb(getTestData());

            assert.equal(result.html, '');
        });
    });

    describe('email', function () {
        it('matches snapshot for default test data', async function () {
            const result = renderForEmail(getTestData());

            assert.ok(result.html);

            await assertPrettifiesTo(result.html, html`
                <p>Hello World</p>
            `);
        });

        it('renders nothing with a missing html', function () {
            const result = renderForEmail(getTestData({html: ''}));
            assert.equal(result.html, '');
        });

        it('removes any extra consecutives whitespaces', async function () {
            const result = renderForEmail(getTestData({html: '<p><span>Hey    you</span></p>'}));

            await assertPrettifiesTo(result.html, html`
                <p><span>Hey you</span></p>
            `);
        });

        it('removes any linebreaks', async function () {
            const result = renderForEmail(getTestData({html: '<p>\n<span>Hey \nyou</span>\n</p>'}));

            await assertPrettifiesTo(result.html, html`
                <p><span>Hey you</span></p>
            `);
        });

        it('renders multiple paragraphs', async function () {
            const result = renderForEmail(getTestData({html: '<p>First paragraph</p><p>Second paragraph</p><p>Third paragraph</p>'}));

            await assertPrettifiesTo(result.html, html`
                <p>First paragraph</p>
                <p>Second paragraph</p>
                <p>Third paragraph</p>
            `);
        });

        describe('replacement strings', function () {
            it('wraps {foo} in %%', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo}%%</p>
                `);
            });

            it('wraps {foo, "default"} in %%', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo, "default"}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo, "default"}%%</p>
                `);
            });

            it('wraps {foo,  "default"} in %% (extra spaces)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo,  "default"}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo,  "default"}%%</p>
                `);
            });

            it('wraps {foo "default"} in %% (missing comma)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo "default"}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo "default"}%%</p>
                `);
            });

            it('wraps {foo  "default"} in %% (extra space, missing comma)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo  "default"}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo  "default"}%%</p>
                `);
            });

            it('does not wrap {invalid } in %% (invalid space at the end)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo}, you are {invalid }</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo}%%, you are {invalid }</p>
                `);
            });

            it('does not wrap { invalid} in %% (invalid space at the beginning)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo}, you are { invalid}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey %%{foo}%%, you are { invalid}</p>
                `);
            });

            it('does not wrap {foo invalid} in %% (two words, missing quotes)', async function () {
                const result = renderForEmail(getTestData({html: '<p>Hey {foo invalid}</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>Hey {foo invalid}</p>
                `);
            });

            it('strips out <code> elements with placeholders', async function () {
                const result = renderForEmail(getTestData({html: '<p>First paragraph</p><code>{placeholder}</code><p>Third paragraph</p>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>First paragraph</p>
                    %%{placeholder}%%
                    <p>Third paragraph</p>
                `);
            });

            it('leaves <code> elements when not used with a placeholder', async function () {
                const result = renderForEmail(getTestData({html: '<p>First paragraph</p><code>Some code</code><p>Third paragraph</p><code>{helper, "test"}</code>'}));

                await assertPrettifiesTo(result.html, html`
                    <p>First paragraph</p>
                    <code>Some code</code>
                    <p>Third paragraph</p>
                    %%{helper, "test"}%%
                `);
            });
        });
    });
});
