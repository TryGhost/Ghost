import assert from 'node:assert/strict';
import {createRenderBackend} from '../src/edit-mode/render-backend.js';

const OPTIONS = {siteUrl: 'https://site.example.com/', contentApiKey: 'abc123'};

function fakeRenderer(body = '<html>ok</html>', status = 200) {
    return {
        async render() {
            return new Response(body, {status});
        }
    };
}

describe('edit-mode render-backend', function () {
    it('rejects renders before any theme is set', async function () {
        const backend = createRenderBackend({...OPTIONS, rendererFactory: async () => fakeRenderer()});

        await assert.rejects(backend.render('https://site.example.com/'), /edit_mode_backend_no_theme/);
    });

    it('keeps the last-good renderer when setTheme fails (no poisoned rendererPromise)', async function () {
        const built = [];
        const rendererFactory = async ({theme}) => {
            built.push(theme);
            if (theme.broken) {
                throw new Error('compile failed');
            }
            return fakeRenderer(`<html>${theme['index.hbs']}</html>`);
        };
        const backend = createRenderBackend({...OPTIONS, rendererFactory});

        await backend.setTheme({'index.hbs': 'good'});
        await assert.rejects(backend.setTheme({broken: true}), /compile failed/);

        // the failed attempt was never cached — renders keep working against
        // the last-good renderer instead of re-rejecting forever
        const result = await backend.render('https://site.example.com/');
        assert.equal(result.status, 200);
        assert.equal(result.html, '<html>good</html>');
        assert.equal(built.length, 2);
    });

    it('follows same-site redirects and surfaces external ones', async function () {
        const rendererFactory = async () => ({
            async render(request) {
                const url = new URL(request.url);
                if (url.pathname === '/about') {
                    return new Response(null, {status: 301, headers: {location: '/about/'}});
                }
                if (url.pathname === '/away/') {
                    return new Response(null, {status: 302, headers: {location: 'https://elsewhere.example.com/'}});
                }
                return new Response('<html>landed</html>', {status: 200});
            }
        });
        const backend = createRenderBackend({...OPTIONS, rendererFactory});
        await backend.setTheme({'index.hbs': 'x'});

        const followed = await backend.render('https://site.example.com/about');
        assert.equal(followed.status, 200);
        assert.equal(followed.url, 'https://site.example.com/about/');

        await assert.rejects(
            backend.render('https://site.example.com/away/'),
            /edit_mode_backend_external_redirect:https:\/\/elsewhere\.example\.com\//
        );
    });
});
