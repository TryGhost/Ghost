import {Modal} from '../../src/components/ui/Modal';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

function renderModal({onClose = vi.fn(), isOpen = true} = {}) {
    return render(
        <Modal isOpen={isOpen} labelledBy="heading" onClose={onClose}>
            <h1 id="heading">Heading</h1>
            <button type="button">First</button>
            <button type="button">Last</button>
        </Modal>
    );
}

describe('Modal', function () {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('still closes on Escape once focus has dropped out of it', function () {
        const onClose = vi.fn();
        renderModal({onClose});
        (document.activeElement as HTMLElement).blur();

        fireEvent.keyDown(document.body, {key: 'Escape'});

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('brings Tab back into itself once focus has dropped out of it', function () {
        // jsdom lays nothing out, so every control would count as hidden
        vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
        renderModal();
        (document.activeElement as HTMLElement).blur();

        fireEvent.keyDown(document.body, {key: 'Tab'});

        expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Close dialog'}));
    });

    it('keeps shortcuts from the page behind it, except save', function () {
        const onPageKey = vi.fn();
        document.addEventListener('keydown', onPageKey);
        try {
            renderModal();
            const first = screen.getByRole('button', {name: 'First'});

            fireEvent.keyDown(first, {key: 'k', metaKey: true});
            fireEvent.keyDown(document.body, {key: 'k', ctrlKey: true});
            fireEvent.keyDown(first, {key: 'a'});
            expect(onPageKey).not.toHaveBeenCalled();

            fireEvent.keyDown(first, {key: 's', metaKey: true});
            fireEvent.keyDown(first, {key: 'ы', code: 'KeyS', ctrlKey: true});
            expect(onPageKey).toHaveBeenCalledTimes(2);
        } finally {
            document.removeEventListener('keydown', onPageKey);
        }
    });

    it('doesn\'t print on Cmd/Ctrl+P, which Admin would have used for preview', function () {
        renderModal();

        expect(fireEvent.keyDown(screen.getByRole('button', {name: 'First'}), {key: 'p', metaKey: true})).toBe(false);
        expect(fireEvent.keyDown(screen.getByRole('button', {name: 'First'}), {key: 'c', metaKey: true})).toBe(true);
    });

    it('gives focus back to the button that opened it', function () {
        const opener = document.createElement('button');
        document.body.append(opener);
        try {
            opener.focus();
            const {rerender} = renderModal();
            expect(document.activeElement).not.toBe(opener);

            rerender(<Modal isOpen={false} onClose={vi.fn()} />);

            expect(document.activeElement).toBe(opener);
        } finally {
            opener.remove();
        }
    });

    it('leaves focus on the page when it was opened from the editor', function () {
        const editor = document.createElement('div');
        editor.contentEditable = 'true';
        // jsdom implements neither focusing an editable nor isContentEditable
        editor.tabIndex = 0;
        Object.defineProperty(editor, 'isContentEditable', {value: true});
        document.body.append(editor);
        try {
            editor.focus();
            expect(document.activeElement).toBe(editor);
            const focusEditor = vi.spyOn(editor, 'focus');
            const {rerender} = renderModal();

            rerender(<Modal isOpen={false} onClose={vi.fn()} />);

            expect(focusEditor).not.toHaveBeenCalled();
        } finally {
            editor.remove();
        }
    });
});
