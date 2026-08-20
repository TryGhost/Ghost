import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {useState} from 'react';

import {BuilderLayout, builderChatWidthStorageKey} from './builder-layout';

const StatefulChat = () => {
    const [count, setCount] = useState(0);
    return <button type='button' onClick={() => setCount(value => value + 1)}>Chat count {count}</button>;
};

describe('BuilderLayout', () => {
    beforeEach(() => {
        sessionStorage.clear();
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1200, writable: true});
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 1200, writable: true});
    });

    it('uses the default chat width and restores the session width', () => {
        const {unmount} = render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);

        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '420px'});
        unmount();

        sessionStorage.setItem(builderChatWidthStorageKey, '560');
        render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);

        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '560px'});
    });

    it('resizes with the pointer and persists the clamped width', () => {
        render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);
        const separator = screen.getByRole('separator', {name: 'Resize chat and preview'});

        fireEvent.pointerDown(separator, {clientX: 420, pointerId: 1});
        fireEvent.pointerMove(window, {clientX: 900, pointerId: 1});
        fireEvent.pointerUp(window, {pointerId: 1});

        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '720px'});
        expect(sessionStorage.getItem(builderChatWidthStorageKey)).toBe('720');
    });

    it('supports keyboard resize and min/max clamps', () => {
        render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);
        const separator = screen.getByRole('separator', {name: 'Resize chat and preview'});

        fireEvent.keyDown(separator, {key: 'ArrowRight'});
        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '436px'});

        fireEvent.keyDown(separator, {key: 'Home'});
        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '320px'});

        fireEvent.keyDown(separator, {key: 'End'});
        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '720px'});
    });

    it('switches narrow views without remounting either child', () => {
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 600, writable: true});
        render(<BuilderLayout chat={<StatefulChat />} preview={<div>Persistent preview</div>} />);

        fireEvent.click(screen.getByRole('button', {name: 'Chat count 0'}));
        fireEvent.click(screen.getByRole('tab', {name: 'Preview'}));
        expect(screen.getByTestId('builder-chat-panel')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByTestId('builder-preview-panel')).toHaveAttribute('aria-hidden', 'false');

        fireEvent.click(screen.getByRole('tab', {name: 'Chat'}));
        expect(screen.getByRole('button', {name: 'Chat count 1'})).toBeInTheDocument();
        expect(screen.getByText('Persistent preview')).toBeInTheDocument();
        expect(screen.getByTestId('builder-preview-panel')).not.toHaveAttribute('hidden');
        expect(screen.getByTestId('builder-preview-panel')).toHaveClass('absolute', 'inset-0');
    });

    it('supports arrow-key tab navigation with associated panels', () => {
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 600, writable: true});
        render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);
        const chatTab = screen.getByRole('tab', {name: 'Chat'});

        chatTab.focus();
        fireEvent.keyDown(chatTab, {key: 'ArrowRight'});

        const previewTab = screen.getByRole('tab', {name: 'Preview'});
        expect(previewTab).toHaveFocus();
        expect(previewTab).toHaveAttribute('aria-selected', 'true');
        expect(previewTab).toHaveAttribute('aria-controls', 'builder-preview-panel');
        expect(screen.getByRole('tabpanel', {name: 'Preview'})).toHaveAttribute('aria-hidden', 'false');
    });

    it('preserves a useful preview width when restoring a wide chat panel', () => {
        Object.defineProperty(window, 'innerWidth', {configurable: true, value: 900, writable: true});
        sessionStorage.setItem(builderChatWidthStorageKey, '720');

        render(<BuilderLayout chat={<div>Chat</div>} preview={<div>Preview</div>} />);

        expect(screen.getByTestId('builder-chat-panel')).toHaveStyle({width: '576px'});
        expect(sessionStorage.getItem(builderChatWidthStorageKey)).toBe('720');
    });
});
