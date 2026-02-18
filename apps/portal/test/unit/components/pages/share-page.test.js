import {fireEvent, render, waitFor} from '../../../utils/test-utils';
import SharePage from '../../../../src/components/pages/share-page';
import copyTextToClipboard from '../../../../src/utils/copy-to-clipboard';

vi.mock('../../../../src/utils/copy-to-clipboard', () => ({
    default: vi.fn()
}));

const addHeadTag = ({tagName, attrs = {}}) => {
    const element = document.createElement(tagName);
    Object.entries(attrs).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });
    document.head.appendChild(element);
    return element;
};

const setup = ({pageData} = {}) => {
    return render(<SharePage />, {
        overrideContext: {
            pageData: pageData || {}
        }
    });
};

describe('SharePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.title = '';
        document.head.innerHTML = '';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders share actions and uses pageData for social links', () => {
        const pageData = {
            url: 'https://example.com/post?ref=test',
            title: 'Example post title'
        };

        const {getByRole, getByText} = setup({pageData});

        expect(getByText('Share')).toBeInTheDocument();
        expect(getByText('Share this post')).toBeInTheDocument();

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const facebookLink = getByRole('link', {name: 'Facebook'});
        const linkedInLink = getByRole('link', {name: 'LinkedIn'});

        const twitterUrl = new URL(twitterLink.getAttribute('href'));
        const facebookUrl = new URL(facebookLink.getAttribute('href'));
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));

        expect(twitterUrl.origin + twitterUrl.pathname).toBe('https://twitter.com/intent/tweet');
        expect(twitterUrl.searchParams.get('url')).toBe(pageData.url);
        expect(twitterUrl.searchParams.get('text')).toBe(pageData.title);

        expect(facebookUrl.origin + facebookUrl.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
        expect(facebookUrl.searchParams.get('u')).toBe(pageData.url);

        expect(linkedInUrl.origin + linkedInUrl.pathname).toBe('https://www.linkedin.com/sharing/share-offsite/');
        expect(linkedInUrl.searchParams.get('url')).toBe(pageData.url);

        expect(twitterLink).toHaveAttribute('target', '_blank');
        expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('falls back to canonical url and og title when pageData is missing', () => {
        addHeadTag({
            tagName: 'link',
            attrs: {
                rel: 'canonical',
                href: 'https://canonical.example/post'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:title',
                content: 'OG title'
            }
        });
        document.title = 'Document title';

        const {getByRole} = setup({pageData: {}});

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('url')).toBe('https://canonical.example/post');
        expect(twitterUrl.searchParams.get('text')).toBe('OG title');
    });

    test('falls back to window location and document title when canonical and og title are missing', () => {
        document.title = 'Document fallback title';

        const {getByRole} = setup({pageData: {}});

        const linkedInLink = getByRole('link', {name: 'LinkedIn'});
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));

        expect(linkedInUrl.searchParams.get('url')).toBe(window.location.href);

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('text')).toBe('Document fallback title');
    });

    test('shows copied state temporarily after successful copy', async () => {
        vi.useFakeTimers();
        copyTextToClipboard.mockResolvedValue(true);

        const {getByRole} = setup({
            pageData: {
                url: 'https://example.com/post'
            }
        });

        const copyButton = getByRole('button', {name: 'Copy link'});
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(copyTextToClipboard).toHaveBeenCalledWith('https://example.com/post');
            expect(getByRole('button', {name: 'Copied'})).toBeInTheDocument();
        });

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(getByRole('button', {name: 'Copy link'})).toBeInTheDocument();
        });
    });
});
