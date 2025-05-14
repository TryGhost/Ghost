import MainLayout from '@src/components/layout/MainLayout';
import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';

describe('MainLayout Component', () => {
    it('renders without crashing', () => {
        render(<MainLayout />);

        // MainLayout is just a wrapper div, so we should be able to find it
        const layoutElement = document.querySelector('.mx-auto.size-full.max-w-page');
        expect(layoutElement).toBeInTheDocument();
    });

    it('renders children correctly', () => {
        render(
            <MainLayout>
                <div data-testid="test-child">Child Content</div>
            </MainLayout>
        );

        const childElement = screen.getByTestId('test-child');
        expect(childElement).toBeInTheDocument();
        expect(childElement).toHaveTextContent('Child Content');
    });

    it('accepts and applies additional props', () => {
        render(
            <MainLayout aria-label="Main Content Area" data-testid="main-layout">
                <div>Content</div>
            </MainLayout>
        );

        const layoutElement = screen.getByTestId('main-layout');
        expect(layoutElement).toBeInTheDocument();
        expect(layoutElement).toHaveAttribute('aria-label', 'Main Content Area');
    });
});
