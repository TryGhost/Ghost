import {PodcastCard} from '../../src/components/ui/cards/PodcastCard';
import {describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';

const podcasts = [
    {
        id: 'p1',
        title: 'The Daily Awesome',
        artworkUrl: '',
        episodes: [
            {id: 'e1', title: 'Episode 1', description: 'First', audioUrl: 'https://example.com/1.mp3', duration: '10:00', artworkUrl: '', status: 'published'},
            {id: 'e2', title: 'Episode 2', description: '', audioUrl: '', duration: '', artworkUrl: '', status: 'draft'}
        ]
    },
    {
        id: 'p2',
        title: 'Other Show',
        artworkUrl: '',
        episodes: [
            {id: 'e3', title: 'Pilot', description: 'Where it began', audioUrl: '', duration: '', artworkUrl: '', status: 'published'}
        ]
    }
];

describe('PodcastCard', () => {
    it('prompts to pick an episode when none is selected', () => {
        render(<PodcastCard podcasts={podcasts} />);
        expect(screen.getByTestId('podcast-placeholder')).toHaveTextContent('No episode selected');
    });

    it('explains where to create podcasts when there are none', () => {
        render(<PodcastCard isEditing={true} podcasts={[]} />);
        expect(screen.getByTestId('podcast-picker-empty')).toHaveTextContent('No podcasts yet');
    });

    it('lists every episode across podcasts, grouped by podcast', () => {
        render(<PodcastCard isEditing={true} podcasts={podcasts} />);

        expect(screen.getAllByTestId('podcast-picker-listOption')).toHaveLength(3);
        const groups = screen.getAllByTestId('podcast-picker-listGroup');
        expect(groups[0]).toHaveTextContent('The Daily Awesome');
        expect(groups[1]).toHaveTextContent('Other Show');
        expect(screen.getAllByTestId('podcast-picker-listOption')[1]).toHaveTextContent('Draft');
    });

    it('omits the group heading when there is a single podcast', () => {
        render(<PodcastCard isEditing={true} podcasts={[podcasts[0]]} />);
        expect(screen.queryByTestId('podcast-picker-listGroup')).toBeNull();
        expect(screen.getAllByTestId('podcast-picker-listOption')).toHaveLength(2);
    });

    it('filters episodes as you type', () => {
        render(<PodcastCard isEditing={true} podcasts={podcasts} />);

        fireEvent.change(screen.getByTestId('podcast-picker-search'), {target: {value: 'pilot'}});
        const options = screen.getAllByTestId('podcast-picker-listOption');
        expect(options).toHaveLength(1);
        expect(options[0]).toHaveTextContent('Pilot');

        fireEvent.change(screen.getByTestId('podcast-picker-search'), {target: {value: 'nothing here'}});
        expect(screen.getByTestId('podcast-picker-no-results')).toHaveTextContent('No episodes match');
    });

    it('reports the picked episode with its podcast', () => {
        const onSelect = vi.fn();
        render(<PodcastCard isEditing={true} podcasts={podcasts} onSelect={onSelect} />);

        fireEvent.mouseDown(screen.getAllByTestId('podcast-picker-listOption')[2]);
        expect(onSelect).toHaveBeenCalledWith(podcasts[1], podcasts[1].episodes[0]);
    });

    it('cancels on Escape', () => {
        const onCancel = vi.fn();
        render(<PodcastCard isEditing={true} podcasts={podcasts} onCancel={onCancel} />);

        fireEvent.keyDown(window, {key: 'Escape'});
        expect(onCancel).toHaveBeenCalled();
    });

    it('previews the selected episode', () => {
        render(
            <PodcastCard
                description="First"
                duration="10:00"
                episodeId="e1"
                podcasts={podcasts}
                podcastTitle="The Daily Awesome"
                title="Episode 1"
            />
        );
        expect(screen.getByTestId('podcast-episode-show')).toHaveTextContent('The Daily Awesome');
        expect(screen.getByTestId('podcast-episode-title')).toHaveTextContent('Episode 1');
    });
});
