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
            title: 'Example post title',
            image: 'https://example.com/post.jpg'
        };

        const {getByRole, getByText, queryByText, getByTestId} = setup({pageData});

        expect(getByText('Share')).toBeInTheDocument();
        expect(queryByText('Share this post')).not.toBeInTheDocument();
        expect(getByText('Example post title')).toBeInTheDocument();
        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://example.com/post.jpg');

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
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:image',
                content: 'https://canonical.example/og-image.jpg'
            }
        });
        document.title = 'Document title';

        const {getByRole, getByText, getByTestId} = setup({pageData: {}});

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('url')).toBe('https://canonical.example/post');
        expect(twitterUrl.searchParams.get('text')).toBe('OG title');
        expect(getByText('OG title')).toBeInTheDocument();
        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://canonical.example/og-image.jpg');
    });

    test('prefers pageData values over DOM metadata when both are present', () => {
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
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:image',
                content: 'https://canonical.example/og-image.jpg'
            }
        });

        const pageData = {
            url: 'https://override.example/post',
            title: 'Override title',
            image: 'https://override.example/image.jpg'
        };

        const {getByRole, getByText, getByTestId} = setup({pageData});

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('url')).toBe('https://override.example/post');
        expect(twitterUrl.searchParams.get('text')).toBe('Override title');
        expect(getByText('Override title')).toBeInTheDocument();
        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://override.example/image.jpg');
    });

    test('falls back to twitter image when og image is missing', () => {
        addHeadTag({
            tagName: 'meta',
            attrs: {
                name: 'twitter:image',
                content: 'https://canonical.example/twitter-image.jpg'
            }
        });
        document.title = 'Document fallback title';

        const {getByTestId} = setup({pageData: {}});

        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://canonical.example/twitter-image.jpg');
    });

    test('falls back to window location and document title when canonical and og title are missing', () => {
        document.title = 'Document fallback title';

        const {getByRole, getByText, queryByTestId} = setup({pageData: {}});

        const linkedInLink = getByRole('link', {name: 'LinkedIn'});
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));

        expect(linkedInUrl.searchParams.get('url')).toBe(window.location.href);

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('text')).toBe('Document fallback title');
        expect(getByText('Document fallback title')).toBeInTheDocument();
        expect(queryByTestId('share-preview-image')).not.toBeInTheDocument();
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
