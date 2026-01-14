import React from 'react';
import sinon from 'sinon';
import {fireEvent, render, screen} from '@testing-library/react';
import {useOutOfViewportClasses} from './hooks';

describe('useOutOfViewportClasses', () => {
    const classes = {
        top: {default: 'default-top', outOfViewport: 'out-top'},
        bottom: {default: 'default-bottom', outOfViewport: 'out-bottom'},
        left: {default: 'default-left', outOfViewport: 'out-left'},
        right: {default: 'default-right', outOfViewport: 'out-right'}
    };

    const TestComponent = () => {
        const ref = React.useRef<HTMLDivElement>(null);
        useOutOfViewportClasses(ref, classes);

        // eslint-disable-next-line i18next/no-literal-string
        return <div ref={ref} data-testid="test-element">Test element</div>;
    };

    afterEach(() => {
        sinon.restore();
    });

    it('should apply default classes on mount when in viewport', () => {
        render(<TestComponent />);

        const element = screen.getByTestId('test-element');
        expect(element).toHaveClass('default-top', 'default-bottom', 'default-left', 'default-right');
    });

    it('should apply outOfViewport classes on mount when out of viewport', () => {
        sinon.stub(HTMLElement.prototype, 'getBoundingClientRect').returns({
            top: -100, // out of viewport
            bottom: 2000, // out of viewport (jest-dom default height: 768)
            left: -5, // out of viewport
            right: 2000, // out of viewport (jest-dom default width: 1024)
            width: 100,
            height: 50,
            x: 0,
            y: 0,
            toJSON: () => ({})
        });

        render(<TestComponent />);

        const element = screen.getByTestId('test-element');
        expect(element).toHaveClass('out-top', 'out-bottom', 'out-left', 'out-right');
    });

    it('should apply outOfViewport classes when element moves out of viewport on resize', () => {
        render(<TestComponent />);

        const element = screen.getByTestId('test-element');
        expect(element).toHaveClass('default-top', 'default-bottom', 'default-left', 'default-right');

        sinon.stub(HTMLElement.prototype, 'getBoundingClientRect').returns({
            top: -100, // out of viewport
            bottom: 2000, // out of viewport (jest-dom default height: 768)
            left: -5, // out of viewport
            right: 2000, // out of viewport (jest-dom default width: 1024)
            width: 100,
            height: 50,
            x: 0,
            y: 0,
            toJSON: () => ({})
        });

        fireEvent.resize(window);

        expect(element).toHaveClass('out-top', 'out-bottom', 'out-left', 'out-right');
    });
});
