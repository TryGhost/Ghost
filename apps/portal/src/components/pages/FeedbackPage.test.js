import {getMemberData, getSiteData} from '../../utils/fixtures-generator';
import {render} from '../../utils/test-utils';
import FeedbackPage from './FeedbackPage';

const setup = (overrides) => {
    const {mockOnActionFn, ...utils} = render(
        <FeedbackPage />,
        {
            overrideContext: {
                ...overrides
            }
        }
    );
    return {
        mockOnActionFn,
        ...utils
    };
};

describe('FeedbackPage', () => {
    const siteData = getSiteData();
    const posts = siteData.posts;
    const member = getMemberData();

    // we need the API to actually test the component, so the bulk of tests will be in the FeedbackFlow file
    test('renders', () => {
        // mock what the larger app would process and set
        const pageData = {
            uuid: member.uuid,
            key: 'key',
            postId: posts[0].id,
            score: 1
        };
        const {getByTestId} = setup({pageData});

        const loaderIcon = getByTestId('loaderIcon');

        expect(loaderIcon).toBeInTheDocument();
    });
});
