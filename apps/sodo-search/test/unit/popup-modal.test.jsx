import AppContext from '../../src/app-context';
import React from 'react';
import {Results} from '../../src/components/popup-modal';
import {fireEvent, render} from '@testing-library/react';

describe('Results keyboard navigation', () => {
    const posts = [
        {id: 'post-1', title: 'First post', excerpt: 'First post excerpt', url: 'https://example.com/first-post/'},
        {id: 'post-2', title: 'Second post', excerpt: 'Second post excerpt', url: 'https://example.com/second-post/'}
    ];

    const renderResults = () => {
        return render(
            <AppContext.Provider value={{searchValue: 'post', t: str => str}}>
                <Results posts={posts} authors={[]} tags={[]} />
            </AppContext.Provider>
        );
    };

    let originalLocation;

    beforeEach(() => {
        originalLocation = window.location;
        delete window.location;
        window.location = {href: 'https://example.com/'};
    });

    afterEach(() => {
        window.location = originalLocation;
    });

    test('navigates to the selected result on Enter', () => {
        renderResults();

        fireEvent.keyDown(document, {key: 'Enter'});

        expect(window.location.href).toBe('https://example.com/first-post/');
    });

    test('does not navigate on Enter during IME composition', () => {
        renderResults();

        fireEvent.keyDown(document, {key: 'Enter', isComposing: true});

        expect(window.location.href).toBe('https://example.com/');
    });

    test('does not navigate on Enter with keyCode 229 (legacy IME)', () => {
        renderResults();

        fireEvent.keyDown(document, {key: 'Enter', keyCode: 229});

        expect(window.location.href).toBe('https://example.com/');
    });
});
