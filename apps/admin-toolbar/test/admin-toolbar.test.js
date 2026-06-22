import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';

const BUNDLE_PATH = path.join(
    import.meta.dirname,
    '../umd/admin-toolbar.min.js'
);

const source = fs.readFileSync(BUNDLE_PATH, 'utf8');

function createDom({
    pageContext = '',
    resourceType = '',
    resourceId = '',
    resourceSlug = '',
    siteAnalyticsEnabled = false,
    activityPubEnabled = false,
    membersEnabled = false,
    commentsEnabled = true
} = {}) {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>
        <main>Site content</main>
        <script
            data-ghost-admin-toolbar="https://admin.example.com/ghost/"
            data-site-title="Example Site"
            ${pageContext ? `data-page-context="${pageContext}"` : ''}
            ${resourceType ? `data-resource-type="${resourceType}"` : ''}
            ${resourceId ? `data-resource-id="${resourceId}"` : ''}
            ${resourceSlug ? `data-resource-slug="${resourceSlug}"` : ''}
            ${siteAnalyticsEnabled ? 'data-site-analytics-enabled="true"' : ''}
            ${activityPubEnabled ? 'data-activitypub-enabled="true"' : ''}
            ${membersEnabled ? 'data-members-enabled="true"' : ''}
            ${commentsEnabled === false ? 'data-comments-enabled="false"' : ''}
        ></script>
    </body></html>`, {
        url: 'https://site.example.com/',
        runScripts: 'outside-only'
    });

    dom.window.requestAnimationFrame = (callback) => {
        callback();
        return 1;
    };
    dom.window.cancelAnimationFrame = () => {};

    return dom;
}

async function runToolbar(dom, response) {
    dom.window.eval(source);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

    const frame = dom.window.document.querySelector('iframe[data-frame="admin-auth"]');
    assert.ok(frame, 'auth frame should be created');

    frame.contentWindow.postMessage = (payload) => {
        const message = JSON.parse(payload);
        const result = typeof response === 'function' ? response(message) : response;
        dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
            origin: 'https://admin.example.com',
            data: JSON.stringify({
                uid: message.uid,
                error: result?.error || null,
                result: result?.result || null
            })
        }));
    };

    frame.dispatchEvent(new dom.window.Event('load'));
    await new Promise((resolve) => {
        dom.window.setTimeout(resolve, 0);
    });

    return {
        frame,
        root: dom.window.document.getElementById('ghost-admin-toolbar-root')
    };
}

function getShadowLinks(root) {
    return Array.from(root.shadowRoot.querySelectorAll('a')).map(link => ({
        label: link.getAttribute('aria-label'),
        href: link.href
    }));
}

function editorUser(overrides = {}) {
    return {
        name: 'Jane Staff',
        roles: [{name: 'Editor'}],
        ...overrides
    };
}

describe('admin-toolbar', function () {
    afterEach(function () {
        delete global.window;
        delete global.document;
    });

    it('does not render when no admin user is returned', async function () {
        const dom = createDom();
        const {root, frame} = await runToolbar(dom, {result: {errors: [{message: 'Unauthorized'}]}});

        assert.equal(root, null);
        assert.equal(frame.isConnected, false);
        dom.window.close();
    });

    it('removes the auth frame when iframe load times out', async function () {
        const dom = createDom();
        const originalSetTimeout = dom.window.setTimeout.bind(dom.window);

        dom.window.setTimeout = (callback, delay) => {
            if (delay === 5000) {
                callback();
                return 1;
            }

            return originalSetTimeout(callback, delay);
        };
        dom.window.clearTimeout = () => {};

        dom.window.eval(source);
        dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

        await new Promise((resolve) => {
            originalSetTimeout(resolve, 0);
        });

        assert.equal(dom.window.document.querySelector('iframe[data-frame="admin-auth"]'), null);
        assert.equal(dom.window.document.getElementById('ghost-admin-toolbar-root'), null);
        dom.window.close();
    });

    it('renders for an authenticated editor', async function () {
        const dom = createDom();
        const {root} = await runToolbar(dom, {result: {users: [editorUser({
            profile_image: 'https://example.com/jane.jpg'
        })]}});

        assert.ok(root);
        assert.match(root.shadowRoot.querySelector('.gh-admin-toolbar-user').getAttribute('aria-label'), /Example Site/);
        assert.match(root.shadowRoot.querySelector('.gh-admin-toolbar-user').getAttribute('aria-label'), /Jane Staff/);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-tooltip').textContent, 'Admin');
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-user').hasAttribute('title'), false);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-avatar-image').src, 'https://example.com/jane.jpg');
        dom.window.close();
    });

    it('does not render for staff below editor role', async function () {
        const dom = createDom();
        const {root, frame} = await runToolbar(dom, {result: {users: [{
            name: 'Jane Staff',
            roles: [{name: 'Author'}]
        }]}});

        assert.equal(root, null);
        assert.equal(frame.isConnected, false);
        dom.window.close();
    });

    it('does not render when user roles are missing', async function () {
        const dom = createDom();
        const {root, frame} = await runToolbar(dom, {result: {users: [{name: 'Jane Staff'}]}});

        assert.equal(root, null);
        assert.equal(frame.isConnected, false);
        dom.window.close();
    });

    it('falls back to an initial when the authenticated staff user has no profile image', async function () {
        const dom = createDom();
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-avatar-image'), null);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-avatar-fallback').textContent, 'J');
        dom.window.close();
    });

    it('links to homepage admin sections with enabled feature actions', async function () {
        const dom = createDom({
            pageContext: 'home',
            resourceType: 'page',
            resourceId: 'homepage-id',
            siteAnalyticsEnabled: true,
            activityPubEnabled: true,
            membersEnabled: true
        });
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Analytics', href: 'https://admin.example.com/ghost/#/analytics'},
            {label: 'Network', href: 'https://admin.example.com/ghost/#/activitypub'},
            {label: 'Posts', href: 'https://admin.example.com/ghost/#/posts/'},
            {label: 'Members', href: 'https://admin.example.com/ghost/#/members'},
            {label: 'Settings', href: 'https://admin.example.com/ghost/#/settings'}
        ]);
        dom.window.close();
    });

    it('omits disabled homepage feature actions', async function () {
        const dom = createDom({pageContext: 'home'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Posts', href: 'https://admin.example.com/ghost/#/posts/'},
            {label: 'Settings', href: 'https://admin.example.com/ghost/#/settings'}
        ]);
        dom.window.close();
    });

    it('links to post edit and analytics for post pages', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Analytics', href: 'https://admin.example.com/ghost/#/posts/analytics/post-id'},
            {label: 'Edit', href: 'https://admin.example.com/ghost/#/editor/post/post-id'},
            {label: 'Comments', href: 'https://admin.example.com/ghost/#/comments?filter=post_id%3Apost-id'}
        ]);
        dom.window.close();
    });

    it('uses isolated tooltip wrappers for toolbar action links', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const actionLinks = Array.from(root.shadowRoot.querySelectorAll('.gh-admin-toolbar-link'));
        const tooltips = Array.from(root.shadowRoot.querySelectorAll('.gh-admin-toolbar-tooltip')).map(tooltip => tooltip.textContent);

        assert.equal(actionLinks.length, 3);
        for (const link of actionLinks) {
            assert.equal(link.hasAttribute('title'), false);
        }
        assert.deepEqual(tooltips, ['Admin', 'Analytics', 'Edit', 'Comments', 'More']);

        dom.window.close();
    });

    it('omits the comments link when site comments are disabled', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id', commentsEnabled: false});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Analytics', href: 'https://admin.example.com/ghost/#/posts/analytics/post-id'},
            {label: 'Edit', href: 'https://admin.example.com/ghost/#/editor/post/post-id'}
        ]);
        dom.window.close();
    });

    it('links to tag edit for tag archives', async function () {
        const dom = createDom({resourceType: 'tag', resourceSlug: 'news'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Edit', href: 'https://admin.example.com/ghost/#/tags/news'}
        ]);
        dom.window.close();
    });

    it('links to page edit without analytics for page pages', async function () {
        const dom = createDom({resourceType: 'page', resourceId: 'page-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'},
            {label: 'Edit', href: 'https://admin.example.com/ghost/#/editor/page/page-id'}
        ]);
        dom.window.close();
    });

    it('omits entry actions on non-entry pages', async function () {
        const dom = createDom();
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const links = getShadowLinks(root);

        assert.deepEqual(links, [
            {label: 'Open Ghost Admin for Jane Staff on Example Site', href: 'https://admin.example.com/ghost/#/'}
        ]);
        dom.window.close();
    });

    it('shows a more menu with minimize and hide actions', async function () {
        const dom = createDom();
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});
        const button = root.shadowRoot.querySelector('.gh-admin-toolbar-button');

        assert.equal(button.getAttribute('aria-label'), 'More');
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-menu'), null);

        button.click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        const items = Array.from(root.shadowRoot.querySelectorAll('.gh-admin-toolbar-menu-item'));

        assert.equal(items[0].textContent, 'Minimize');
        assert.equal(items[0].tagName, 'BUTTON');
        assert.equal(items[1].textContent, 'Hide toolbar');
        assert.equal(items[1].getAttribute('href'), '/?admin=0');
        dom.window.close();
    });

    it('minimizes the toolbar and expands it on hover', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        root.shadowRoot.querySelector('.gh-admin-toolbar-menu-item').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        const pill = root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill');

        assert.notEqual(pill, null);
        assert.equal(pill.getAttribute('aria-label'), 'Show admin toolbar');
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-mode'), true);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-expanded'), false);

        root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-mode'), true);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-expanded'), true);

        root.shadowRoot.querySelector('.gh-admin-toolbar').dispatchEvent(new dom.window.MouseEvent('mouseleave', {
            bubbles: true
        }));
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-mode'), true);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-expanded'), false);
        assert.notEqual(root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill'), null);
        dom.window.close();
    });

    it('remembers minimized state between page loads', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-menu-item').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.equal(dom.window.localStorage.getItem('ghost-admin-toolbar-display'), 'minimized');
        dom.window.close();

        const nextDom = createDom({resourceType: 'post', resourceId: 'post-id'});
        nextDom.window.localStorage.setItem('ghost-admin-toolbar-display', 'minimized');
        const {root: nextRoot} = await runToolbar(nextDom, {result: {users: [editorUser()]}});

        assert.notEqual(nextRoot.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill'), null);
        assert.equal(nextRoot.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-mode'), true);
        assert.equal(nextRoot.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-expanded'), false);
        nextDom.window.close();
    });

    it('shows a maximize action when the minimized toolbar is expanded', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-menu-item').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        const items = Array.from(root.shadowRoot.querySelectorAll('.gh-admin-toolbar-menu-item'));

        assert.equal(items[0].textContent, 'Maximize');

        items[0].click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.equal(dom.window.localStorage.getItem('ghost-admin-toolbar-display'), 'expanded');

        root.shadowRoot.querySelector('.gh-admin-toolbar').dispatchEvent(new dom.window.MouseEvent('mouseleave', {
            bubbles: true
        }));
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.notEqual(root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill'), null);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-mode'), false);
        dom.window.close();
    });

    it('keeps a minimized toolbar expanded while the more menu is open', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-menu-item').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-minimized-pill').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });
        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        root.shadowRoot.querySelector('.gh-admin-toolbar').dispatchEvent(new dom.window.MouseEvent('mouseleave', {
            bubbles: true
        }));
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.notEqual(root.shadowRoot.querySelector('.gh-admin-toolbar-menu'), null);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar').classList.contains('gh-admin-toolbar-minimized-expanded'), true);
        assert.equal(root.shadowRoot.querySelector('.gh-admin-toolbar-menu-item').textContent, 'Maximize');
        dom.window.close();
    });

    it('hides toolbar tooltip popups while the more menu is open', async function () {
        const dom = createDom({resourceType: 'post', resourceId: 'post-id'});
        const {root} = await runToolbar(dom, {result: {users: [editorUser()]}});

        const initialTooltipCount = root.shadowRoot.querySelectorAll('.gh-admin-toolbar-tooltip').length;

        assert.ok(initialTooltipCount > 0);

        root.shadowRoot.querySelector('.gh-admin-toolbar-button').click();
        await new Promise((resolve) => {
            dom.window.setTimeout(resolve, 0);
        });

        assert.notEqual(root.shadowRoot.querySelector('.gh-admin-toolbar-menu'), null);
        assert.equal(root.classList.contains('gh-admin-toolbar-menu-open'), true);
        assert.equal(root.shadowRoot.querySelectorAll('.gh-admin-toolbar-tooltip').length, initialTooltipCount);
        dom.window.close();
    });
});
