import {fireEvent, render, waitFor} from '../../../utils/test-utils';
import ShareModal from '../../../../src/components/pages/share-modal';
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

const setup = () => {
    return render(<ShareModal />);
};

describe('ShareModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        document.title = '';
        document.head.innerHTML = '';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders share actions and uses DOM metadata for social links', () => {
        addHeadTag({
            tagName: 'link',
            attrs: {
                rel: 'canonical',
                href: 'https://example.com/post?ref=test'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:title',
                content: 'Example post title'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:description',
                content: 'Example post excerpt'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:image',
                content: 'https://example.com/post.jpg'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                property: 'og:site_name',
                content: 'Example site'
            }
        });
        addHeadTag({
            tagName: 'meta',
            attrs: {
                name: 'author',
                content: 'Jane Doe'
            }
        });
        addHeadTag({
            tagName: 'link',
            attrs: {
                rel: 'icon',
                href: 'https://example.com/favicon.png'
            }
        });

        const {getByRole, getByText, queryByText, getByTestId} = setup();

        expect(getByText('Share')).toBeInTheDocument();
        expect(queryByText('Share this post')).not.toBeInTheDocument();
        expect(getByText('Example post title')).toBeInTheDocument();
        expect(getByText('Example post excerpt')).toBeInTheDocument();
        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://example.com/post.jpg');
        expect(getByTestId('share-preview-favicon')).toHaveAttribute('src', 'https://example.com/favicon.png');
        expect(getByText('Example site')).toBeInTheDocument();
        expect(getByText('| Jane Doe')).toBeInTheDocument();

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const threadsLink = getByRole('link', {name: 'Threads'});
        const facebookLink = getByRole('link', {name: 'Facebook'});
        const linkedInLink = getByRole('link', {name: 'LinkedIn'});

        const twitterUrl = new URL(twitterLink.getAttribute('href'));
        const threadsUrl = new URL(threadsLink.getAttribute('href'));
        const facebookUrl = new URL(facebookLink.getAttribute('href'));
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));

        expect(twitterUrl.origin + twitterUrl.pathname).toBe('https://twitter.com/intent/tweet');
        expect(twitterUrl.searchParams.get('url')).toBe('https://example.com/post?ref=test');
        expect(twitterUrl.searchParams.get('text')).toBe('Example post title');

        expect(threadsUrl.origin + threadsUrl.pathname).toBe('https://www.threads.net/intent/post');
        expect(threadsUrl.searchParams.get('text')).toBe('Example post title https://example.com/post?ref=test');

        expect(facebookUrl.origin + facebookUrl.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
        expect(facebookUrl.searchParams.get('u')).toBe('https://example.com/post?ref=test');

        expect(linkedInUrl.origin + linkedInUrl.pathname).toBe('https://www.linkedin.com/sharing/share-offsite/');
        expect(linkedInUrl.searchParams.get('url')).toBe('https://example.com/post?ref=test');

        expect(twitterLink).toHaveAttribute('target', '_blank');
        expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('falls back to meta description when og description is missing', () => {
        addHeadTag({
            tagName: 'meta',
            attrs: {
                name: 'description',
                content: 'Meta description fallback'
            }
        });
        document.title = 'Document fallback title';

        const {getByText} = setup();

        expect(getByText('Meta description fallback')).toBeInTheDocument();
    });

    test('falls back to twitter image when og image is missing', () => {
        addHeadTag({
            tagName: 'meta',
            attrs: {
                name: 'twitter:image',
                content: 'https://canonical.example/twitter-image.jpg'
            }
        });

        const {getByTestId} = setup();

        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://canonical.example/twitter-image.jpg');
    });

    test('falls back to window location, document title and domain when canonical metadata is missing', () => {
        document.title = 'Document fallback title';

        const {getByRole, getByText, queryByTestId} = setup();

        const linkedInLink = getByRole('link', {name: 'LinkedIn'});
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));

        expect(linkedInUrl.searchParams.get('url')).toBe(window.location.href);

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('text')).toBe('Document fallback title');
        expect(getByText('Document fallback title')).toBeInTheDocument();
        expect(getByText(window.location.hostname.replace(/^www\./, ''))).toBeInTheDocument();
        expect(queryByTestId('share-preview-image')).not.toBeInTheDocument();
    });

    test('shows copied state temporarily after successful copy', async () => {
        vi.useFakeTimers();
        copyTextToClipboard.mockResolvedValue(true);

        const {getByRole} = setup();

        const copyButton = getByRole('button', {name: 'Copy link'});
        fireEvent.click(copyButton);

        await waitFor(() => {
            expect(copyTextToClipboard).toHaveBeenCalledWith(window.location.href);
            expect(getByRole('button', {name: 'Copied'})).toBeInTheDocument();
        });

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(getByRole('button', {name: 'Copy link'})).toBeInTheDocument();
        });
    });
});
