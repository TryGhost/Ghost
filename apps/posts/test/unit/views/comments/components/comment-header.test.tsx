import {CommentHeader} from '../../../../../src/views/comments/components/comment-header';
import {fireEvent, render, screen} from '@testing-library/react';

describe('CommentHeader', () => {
    it('renders pinned badge as an unpin button', () => {
        const onUnpinClick = vi.fn();

        render(
            <CommentHeader
                createdAt="2026-05-01T18:00:00.000Z"
                isPinned={true}
                memberName="Test member"
                onUnpinClick={onUnpinClick}
            />
        );

        const unpinButton = screen.getByRole('button', {name: 'Unpin comment'});

        expect(unpinButton).toHaveTextContent('Pinned');
        expect(unpinButton).toHaveTextContent('Unpin');

        fireEvent.click(unpinButton);

        expect(onUnpinClick).toHaveBeenCalledOnce();
    });

    it('renders pinned badge as static text when no unpin action is available', () => {
        render(
            <CommentHeader
                createdAt="2026-05-01T18:00:00.000Z"
                isPinned={true}
                memberName="Test member"
            />
        );

        expect(screen.queryByRole('button', {name: 'Unpin comment'})).not.toBeInTheDocument();
        expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
});
