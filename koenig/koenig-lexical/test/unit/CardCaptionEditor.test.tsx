import {CardCaptionEditor} from '../../src/components/ui/CardCaptionEditor';
import {LexicalComposer} from '@lexical/react/LexicalComposer';
import {createEditor} from 'lexical';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';

function renderWithComposer(component) {
    return render(
        <LexicalComposer initialConfig={{namespace: 'CardCaptionEditorTest', nodes: [], onError: error => { throw error; }}}>
            {component}
        </LexicalComposer>
    );
}

function renderCaptionEditor({generateAltText, imageUrl = '/content/images/photo.jpg', setAltText = vi.fn()} = {}) {
    renderWithComposer(
        <CardCaptionEditor
            altText="Existing alt text"
            altTextPlaceholder="Type alt text for image (optional)"
            captionEditor={createEditor()}
            captionEditorInitialState={null}
            captionPlaceholder="Type caption for image (optional)"
            dataTestId="image-caption-editor"
            generateAltText={generateAltText}
            imageUrl={imageUrl}
            isSelected={true}
            readOnly={false}
            setAltText={setAltText}
        />
    );

    fireEvent.click(screen.getByTestId('alt-toggle-button'));

    return {setAltText};
}

describe('CardCaptionEditor alt text generation', function () {
    it('only shows Generate when a callback and image URL are present', function () {
        const {unmount} = renderWithComposer(
            <CardCaptionEditor
                altText=""
                captionEditor={createEditor()}
                generateAltText={vi.fn()}
                imageUrl=""
                isSelected={true}
                setAltText={vi.fn()}
            />
        );

        fireEvent.click(screen.getByTestId('alt-toggle-button'));
        expect(screen.queryByTestId('generate-alt-text-button')).not.toBeInTheDocument();
        unmount();

        renderCaptionEditor({generateAltText: vi.fn()});
        expect(screen.getByTestId('generate-alt-text-button')).toBeVisible();
    });

    it('blocks repeated generation while pending and replaces alt text on success', async function () {
        let resolveGeneration;
        const generateAltText = vi.fn(() => new Promise((resolve) => {
            resolveGeneration = resolve;
        }));
        const setAltText = vi.fn();

        renderCaptionEditor({generateAltText, setAltText});

        const button = screen.getByTestId('generate-alt-text-button');
        fireEvent.click(button);
        fireEvent.click(button);

        expect(generateAltText).toHaveBeenCalledOnce();
        expect(generateAltText).toHaveBeenCalledWith('/content/images/photo.jpg');
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('Generating…');

        resolveGeneration('A cyclist crossing a stone bridge.');

        await waitFor(() => expect(setAltText).toHaveBeenCalledWith('A cyclist crossing a stone bridge.'));
        expect(button).toBeEnabled();
        expect(button).toHaveTextContent('Generate');
    });

    it('preserves alt text and surfaces feedback when generation fails', async function () {
        const generateAltText = vi.fn().mockRejectedValue(new Error('Alt text could not be generated.'));
        const setAltText = vi.fn();

        renderCaptionEditor({generateAltText, setAltText});
        fireEvent.click(screen.getByTestId('generate-alt-text-button'));

        expect(await screen.findByRole('alert')).toHaveTextContent('Alt text could not be generated.');
        expect(setAltText).not.toHaveBeenCalled();
        expect(screen.getByTestId('image-caption-editor')).toHaveValue('Existing alt text');
    });
});
