import CardContext from '../../src/context/CardContext';
import React from 'react';
import useFileDragAndDrop from '../../src/hooks/useFileDragAndDrop';
import {GalleryCard} from '../../src/components/ui/cards/GalleryCard';
import {ImageCard} from '../../src/components/ui/cards/ImageCard';
import {MediaUploader} from '../../src/components/ui/MediaUploader';
import {ProductCardImage} from '../../src/components/ui/cards/ProductCard/ProductCardImage';
import {RatingButton} from '../../src/components/ui/cards/ProductCard/RatingButton';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';

function Card({readOnly = true, children}) {
    const defaults = React.useContext(CardContext);
    return <CardContext.Provider value={{...defaults, readOnly}}>{children}</CardContext.Provider>;
}

vi.mock('../../src/components/ui/CardCaptionEditor', () => ({CardCaptionEditor: () => null}));

afterEach(cleanup);

describe('Read-only card controls', () => {
    it('shows product ratings without allowing them to change', () => {
        const onRatingChange = vi.fn();
        const view = render(<Card><RatingButton rating={3} onRatingChange={onRatingChange} /></Card>);
        const stars = view.getByTestId('product-stars');
        expect(view.queryAllByRole('button')).toHaveLength(0);
        fireEvent.click(stars.lastElementChild);
        expect(onRatingChange).not.toHaveBeenCalled();

        view.rerender(<Card readOnly={false}><RatingButton rating={3} onRatingChange={onRatingChange} /></Card>);
        fireEvent.click(view.getAllByRole('button')[4]);
        expect(onRatingChange).toHaveBeenCalledWith(5);
    });

    it('keeps media visible without image editing actions', () => {
        const onRemoveMedia = vi.fn();
        const media = <MediaUploader additionalActions={<button type="button">Replace</button>} alt="Saved image" src="https://example.com/image.jpg" isPinturaEnabled onRemoveMedia={onRemoveMedia} />;
        const view = render(<Card>{media}</Card>);
        expect(view.getByRole('img').getAttribute('src')).toBe('https://example.com/image.jpg');
        expect(view.queryAllByRole('button')).toHaveLength(0);

        view.rerender(<Card readOnly={false}>{media}</Card>);
        fireEvent.click(view.getByTestId('media-upload-remove'));
        expect(onRemoveMedia).toHaveBeenCalledOnce();
    });

    it.each(['image', 'gallery'])('hides editing actions on a saved %s', (type) => {
        const media = type === 'image'
            ? <ImageCard altText="Saved image" imageUploader={{progress: 100}} src="https://example.com/image.jpg" isPinturaEnabled />
            : <GalleryCard filesDropper={{}} images={[{src: 'https://example.com/image.jpg', width: 100, height: 100}]} />;
        const view = render(<Card>{media}</Card>);
        expect(view.getByRole('img').getAttribute('src')).toBe('https://example.com/image.jpg');
        expect(view.queryAllByRole('button')).toHaveLength(0);
        expect(view.container.querySelector('input[type="file"]')).toBeNull();

        view.rerender(<Card readOnly={false}>{media}</Card>);
        expect(view.queryAllByRole('button')).toHaveLength(1);
    });

    it.each(['media', 'product'])('does not offer uploads for an empty %s image', (type) => {
        const media = type === 'media'
            ? <MediaUploader icon="image" />
            : <ProductCardImage imgMimeTypes={['image/*']} />;
        const view = render(<Card>{media}</Card>);
        expect(view.queryAllByRole('button')).toHaveLength(0);
        expect(view.container.querySelector('input[type="file"]')).toBeNull();

        view.rerender(<Card readOnly={false}>{media}</Card>);
        expect(view.queryAllByRole('button')).toHaveLength(1);
        expect(view.container.querySelector('input[type="file"]')).not.toBeNull();
    });

    it('does not upload dropped files in a read-only card', () => {
        const handleDrop = vi.fn();
        function DropTarget() {
            const {setRef} = useFileDragAndDrop({handleDrop});
            return <div ref={setRef} data-testid="drop-target" />;
        }
        const view = render(<Card><DropTarget /></Card>);
        const file = new File(['image'], 'image.png', {type: 'image/png'});
        const drop = () => fireEvent.drop(view.getByTestId('drop-target'), {dataTransfer: {files: [file]}});
        drop();
        expect(handleDrop).not.toHaveBeenCalled();

        view.rerender(<Card readOnly={false}><DropTarget /></Card>);
        drop();
        expect(handleDrop).toHaveBeenCalledWith([file]);
    });
});
