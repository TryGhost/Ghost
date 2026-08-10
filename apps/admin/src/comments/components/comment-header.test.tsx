import {CommentHeader} from './comment-header';
import {TooltipProvider} from '@tryghost/shade/components';
import {fireEvent, render, screen} from '@testing-library/react';

// CommentHeader renders tooltips that expect a TooltipProvider ancestor,
// which is supplied once at the comments-list level in the app.
const renderWithProvider = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('CommentHeader', () => {
    it('renders pinned badge as an unpin button', () => {
        const onUnpinClick = vi.fn();

        renderWithProvider(
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
        renderWithProvider(
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
