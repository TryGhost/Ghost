import ContentBox from './ContentBox';
import React from 'react';
import {AppContext} from '../AppContext';
import {ROOT_DIV_ID} from '../utils/constants';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// Mock the Content and Loading components
vi.mock('./content/Content', () => ({
    default: () => <div data-testid="content">${`Content component`}</div>
}));

vi.mock('./content/Loading', () => ({
    default: () => <div data-testid="loading">${`Loading component`}</div>
}));

const contextualRender = (ui, {appContext = {}, ...renderOptions} = {}) => {
    const contextWithDefaults = {
        accentColor: '#000000',
        colorScheme: undefined,
        t: str => str,
        ...appContext
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('ContentBox', () => {
    let rootDiv;
    let originalMatchMedia;

    beforeEach(() => {
        // Create ROOT_DIV_ID element and add to body
        rootDiv = document.createElement('div');
        rootDiv.id = ROOT_DIV_ID;
        
        // Create a parent element to test container color detection
        const parent = document.createElement('div');
        parent.appendChild(rootDiv);
        document.body.appendChild(parent);
        
        // Mock matchMedia
        originalMatchMedia = window.matchMedia;
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        }));
    });

    afterEach(() => {
        // Clean up
        if (rootDiv && rootDiv.parentElement) {
            document.body.removeChild(rootDiv.parentElement);
        }
        window.matchMedia = originalMatchMedia;
        vi.restoreAllMocks();
    });

    it('renders Loading component when done is false', () => {
        contextualRender(<ContentBox done={false} />);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });

    it('renders Content component when done is true', () => {
        contextualRender(<ContentBox done={true} />);
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('uses light mode when colorScheme is light', () => {
        const {container} = contextualRender(<ContentBox done={true} />, {
            appContext: {colorScheme: 'light'}
        });
        
        const section = container.querySelector('section');
        expect(section).not.toHaveClass('dark');
    });

    it('uses dark mode when colorScheme is dark', () => {
        const {container} = contextualRender(<ContentBox done={true} />, {
            appContext: {colorScheme: 'dark'}
        });
        
        const section = container.querySelector('section');
        expect(section).toHaveClass('dark');
    });

    it('sets accent color from appContext', () => {
        const accentColor = '#ff0000';
        const {container} = contextualRender(<ContentBox done={true} />, {
            appContext: {accentColor}
        });
        
        const section = container.querySelector('section');
        expect(section).toHaveStyle({'--gh-accent-color': accentColor});
    });

    it('has correct data-loaded attribute based on done prop', () => {
        const {container, rerender} = contextualRender(<ContentBox done={false} />);
        
        let section = container.querySelector('section');
        expect(section).toHaveAttribute('data-loaded', 'false');
        
        rerender(
            <AppContext.Provider value={{accentColor: '#000000', colorScheme: undefined, t: str => str}}>
                <ContentBox done={true} />
            </AppContext.Provider>
        );
        
        section = container.querySelector('section');
        expect(section).toHaveAttribute('data-loaded', 'true');
    });

    it('falls back to color detection when colorScheme is undefined', () => {
        // Mock getComputedStyle for parent element with dark colors
        const originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = vi.fn().mockImplementation((element) => {
            if (element === rootDiv.parentElement) {
                return {
                    getPropertyValue: (prop) => {
                        if (prop === 'color') {
                            return 'rgb(255, 255, 255)'; // white text = dark background
                        }
                        return '';
                    }
                };
            }
            return originalGetComputedStyle(element);
        });

        const {container} = contextualRender(<ContentBox done={true} />);
        
        const section = container.querySelector('section');
        expect(section).toHaveClass('dark');
        
        window.getComputedStyle = originalGetComputedStyle;
    });
});