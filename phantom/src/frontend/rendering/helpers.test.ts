import {describe, expect, it} from 'vitest';
import Handlebars from 'handlebars';
import {registerHelpers} from './helpers.js';

const createInstance = () => {
    const instance = Handlebars.create();
    registerHelpers(instance);
    return instance;
};

const render = (source: string, data: Record<string, unknown>) => {
    const instance = createInstance();
    const template = instance.compile(source);
    return template(data, {data: {root: data, site: data.site}});
};

describe('theme helpers', () => {
    it('filters and limits collections in {{#get}}', () => {
        const posts = [
            {id: '1', title: 'A', featured: true},
            {id: '2', title: 'B', featured: false},
            {id: '3', title: 'C', featured: true},
            {id: '4', title: 'D', featured: true}
        ];
        const output = render(
            '{{#get "posts" filter="featured:true" limit="2" as |featured|}}{{#foreach featured}}{{title}},{{/foreach}}{{else}}none{{/get}}',
            {posts}
        );
        expect(output).toBe('A,C,');
    });

    it('resolves placeholders in {{#get}} filters against the context', () => {
        const posts = [
            {id: '1', title: 'Current'},
            {id: '2', title: 'Other'}
        ];
        const output = render(
            '{{#get "posts" filter="id:-{{post.id}}" as |next|}}{{#foreach next}}{{title}},{{/foreach}}{{/get}}',
            {posts, post: {id: '1'}}
        );
        expect(output).toBe('Other,');
    });

    it('renders the inverse block when {{#get}} filters everything out', () => {
        const output = render(
            '{{#get "posts" filter="featured:true" as |featured|}}{{#foreach featured}}{{title}}{{/foreach}}{{else}}none{{/get}}',
            {posts: [{id: '1', title: 'A', featured: false}]}
        );
        expect(output).toBe('none');
    });

    it('prefers the rendered entry description in ghost_head', () => {
        const output = render('{{ghost_head}}', {
            site: {
                title: 'Site',
                description: 'site description',
                url: 'http://localhost:2369'
            },
            meta_description: 'Short description and meta'
        });
        expect(output).toContain('<meta name="description" content="Short description and meta">');
        expect(output).not.toContain('content="site description"');
    });

    it('injects the announcement bar script for previews and saved settings', () => {
        const base = {title: 'Site', description: null, url: 'http://localhost:2369'};

        const idle = render('{{ghost_head}}', {site: base});
        expect(idle).not.toContain('announcement-bar.min.js');

        const preview = render('{{ghost_head}}', {
            site: {...base, _preview: 'announcement_bg=dark&announcement=%3Cp%3EHi%3C%2Fp%3E&announcement_vis=visitors'}
        });
        expect(preview).toContain('announcement-bar.min.js');
        expect(preview).toContain('data-preview="true"');

        const saved = render('{{ghost_head}}', {
            site: {...base, announcement_content: '<p>Hello</p>', announcement_visibility: ['visitors']}
        });
        expect(saved).toContain('announcement-bar.min.js');
        expect(saved).not.toContain('data-preview');
    });

    it('escapes html in ghost_head meta values', () => {
        const output = render('{{ghost_head}}', {
            site: {
                title: 'Site "x" <script>alert(1)</script>',
                description: 'desc',
                url: 'http://localhost:2369'
            }
        });
        expect(output).not.toContain('<script>alert(1)</script>');
        expect(output).toContain('&lt;script&gt;');
    });

    it('formats post dates with the requested format', () => {
        const output = render(
            '{{date published_at format="DD MMM YYYY"}}',
            {published_at: '2025-07-22T10:10:32.000Z'}
        );
        expect(output).toBe('22 Jul 2025');
    });

    it('supports match as a subexpression', () => {
        const output = render(
            '{{#if (match status "published")}}yes{{else}}no{{/if}}',
            {status: 'published'}
        );
        expect(output).toBe('yes');
    });

    it('renders navigation items from site settings', () => {
        const output = render('{{navigation}}', {
            site: {
                navigation: [
                    {label: 'Home', url: '/'},
                    {label: 'About', url: '/about/'}
                ]
            }
        });
        expect(output).toContain('href="/"');
        expect(output).toContain('Home');
        expect(output).toContain('href="/about/"');
        expect(output).toContain('About');
    });
});
