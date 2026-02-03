import {render} from '../../../../utils/test-utils';
import TransistorPodcastsAction from '../../../../../src/components/pages/AccountHomePage/components/transistor-podcasts-action';

describe('TransistorPodcastsAction', () => {
    const setup = ({hasPodcasts, memberUuid} = {}) => {
        const {mockDoActionFn, ...utils} = render(
            <TransistorPodcastsAction hasPodcasts={hasPodcasts} memberUuid={memberUuid} />,
            {
                overrideContext: {}
            }
        );
        return {mockDoActionFn, ...utils};
    };

    test('renders nothing when hasPodcasts is false', () => {
        const {queryByText} = setup({hasPodcasts: false, memberUuid: 'test-uuid'});
        expect(queryByText('Podcasts')).not.toBeInTheDocument();
        expect(queryByText('Subscribe')).not.toBeInTheDocument();
    });

    test('renders nothing when memberUuid is missing', () => {
        const {queryByText} = setup({hasPodcasts: true, memberUuid: null});
        expect(queryByText('Podcasts')).not.toBeInTheDocument();
    });

    test('renders Podcasts section with Subscribe link when hasPodcasts is true', () => {
        const {queryByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
        expect(queryByText('Podcasts')).toBeInTheDocument();
        expect(queryByText('Subscribe')).toBeInTheDocument();
    });

    test('Subscribe link points to correct Transistor URL', () => {
        const {getByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
        const link = getByText('Subscribe');
        expect(link.getAttribute('href')).toBe('https://partner.transistor.fm/ghost/test-uuid-123');
    });

    test('Subscribe link opens in new tab', () => {
        const {getByText} = setup({hasPodcasts: true, memberUuid: 'test-uuid-123'});
        const link = getByText('Subscribe');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
