import {render} from '../../../../utils/test-utils';
import TransistorPodcastsAction from '../../../../../src/components/pages/AccountHomePage/components/transistor-podcasts-action';

describe('TransistorPodcastsAction', () => {
    const TEST_UUID = '12345678-1234-4123-8123-123456789abc';

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
        const {queryByText} = setup({hasPodcasts: true, memberUuid: TEST_UUID});
        expect(queryByText('Podcasts')).toBeInTheDocument();
        expect(queryByText('Subscribe')).toBeInTheDocument();
    });

    test('Subscribe link points to correct Transistor URL', () => {
        const {getByText} = setup({hasPodcasts: true, memberUuid: TEST_UUID});
        const link = getByText('Subscribe');
        expect(link.getAttribute('href')).toBe(`https://partner.transistor.fm/ghost/${TEST_UUID}`);
    });

    test('Subscribe link opens in new tab', () => {
        const {getByText} = setup({hasPodcasts: true, memberUuid: TEST_UUID});
        const link = getByText('Subscribe');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
});
