import {describe, expect, it} from 'vitest';
import {createRouteMatcher} from '../../src/frontend/routing/matcher.js';

describe('frontend route matcher', () => {
    it('matches collection routes', () => {
        const matcher = createRouteMatcher();
        expect(matcher.matchRoute('/')).toEqual({type: 'collection', page: 1});
        expect(matcher.matchRoute('/page/3/')).toEqual({type: 'collection', page: 3});
    });

    it('matches entry routes', () => {
        const matcher = createRouteMatcher();
        expect(matcher.matchRoute('/hello/')).toEqual({type: 'entry', slug: 'hello'});
    });

    it('matches tag and author archives with optional pagination', () => {
        const matcher = createRouteMatcher();
        expect(matcher.matchRoute('/tag/news/')).toEqual({type: 'tag', slug: 'news', page: 1});
        expect(matcher.matchRoute('/tag/news/page/2/')).toEqual({type: 'tag', slug: 'news', page: 2});
        expect(matcher.matchRoute('/author/fixture/')).toEqual({type: 'author', slug: 'fixture', page: 1});
        expect(matcher.matchRoute('/author/fixture/page/3/')).toEqual({type: 'author', slug: 'fixture', page: 3});
    });
});
