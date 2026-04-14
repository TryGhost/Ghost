import {fireEvent, render, waitFor} from '../../../utils/test-utils';
import ShareModal from '../../../../src/components/pages/share/share-modal';
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

        const {container, getByRole, getByText, queryByRole, queryByText, getByTestId} = setup();

        expect(getByText('Share')).toBeInTheDocument();
        expect(queryByText('Share this post')).not.toBeInTheDocument();
        expect(getByText('Example post title')).toBeInTheDocument();
        expect(getByText('Example post excerpt')).toBeInTheDocument();
        expect(getByTestId('share-preview-image')).toHaveAttribute('src', 'https://example.com/post.jpg');
        expect(getByTestId('share-preview-favicon')).toHaveAttribute('src', 'https://example.com/favicon.png');
        expect(getByText('Example site')).toBeInTheDocument();
        expect(getByText('|')).toBeInTheDocument();
        expect(getByText('Jane Doe')).toBeInTheDocument();
        expect(container.querySelector('.gh-portal-share-preview-meta')).not.toHaveTextContent('Example site| Jane Doe');

        const actions = Array.from(container.querySelector('.gh-portal-share-actions').children);
        expect(actions[0]).toHaveClass('gh-portal-share-action', 'copy');
        expect(actions[1]).toHaveClass('gh-portal-share-action', 'twitter');
        expect(actions[2]).toHaveClass('gh-portal-share-action', 'linkedin');
        expect(actions[3]).toHaveClass('gh-portal-share-action', 'email');
        expect(actions[4]).toHaveClass('gh-portal-share-more');

        const copyButton = getByRole('button', {name: 'Copy link'});
        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const linkedInLink = getByRole('link', {name: 'LinkedIn'});
        const emailLink = getByRole('link', {name: 'Email'});
        const moreOptionsButton = getByRole('button', {name: 'More options'});

        expect(copyButton).toBeInTheDocument();
        expect(moreOptionsButton).toHaveAttribute('aria-expanded', 'false');
        expect(queryByRole('menu')).not.toBeInTheDocument();

        const twitterUrl = new URL(twitterLink.getAttribute('href'));
        const linkedInUrl = new URL(linkedInLink.getAttribute('href'));
        const emailUrl = new URL(emailLink.getAttribute('href'));

        expect(twitterUrl.origin + twitterUrl.pathname).toBe('https://twitter.com/intent/tweet');
        expect(twitterUrl.searchParams.get('url')).toBe('https://example.com/post?ref=test');
        expect(twitterUrl.searchParams.get('text')).toBe('Example post title');

        expect(linkedInUrl.origin + linkedInUrl.pathname).toBe('https://www.linkedin.com/shareArticle');
        expect(linkedInUrl.searchParams.get('mini')).toBe('true');
        expect(linkedInUrl.searchParams.get('url')).toBe('https://example.com/post?ref=test');
        expect(linkedInUrl.searchParams.get('title')).toBe('Example post title');

        expect(emailUrl.protocol).toBe('mailto:');
        expect(emailUrl.searchParams.get('subject')).toBe('Example post title');
        expect(emailUrl.searchParams.get('body')).toBe('Example post title\n\nhttps://example.com/post?ref=test');
        expect(emailLink.getAttribute('href')).toContain('Example%20post%20title');
        expect(emailLink.getAttribute('href')).not.toContain('+');

        expect(twitterLink).toHaveAttribute('target', '_blank');
        expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');

        fireEvent.click(moreOptionsButton);

        expect(moreOptionsButton).toHaveAttribute('aria-expanded', 'true');
        expect(getByRole('menu')).toBeInTheDocument();

        const facebookLink = getByRole('menuitem', {name: 'Facebook'});
        const threadsLink = getByRole('menuitem', {name: 'Threads'});
        const blueskyLink = getByRole('menuitem', {name: 'Bluesky'});

        const facebookUrl = new URL(facebookLink.getAttribute('href'));
        const threadsUrl = new URL(threadsLink.getAttribute('href'));
        const blueskyUrl = new URL(blueskyLink.getAttribute('href'));

        expect(facebookUrl.origin + facebookUrl.pathname).toBe('https://www.facebook.com/sharer/sharer.php');
        expect(facebookUrl.searchParams.get('u')).toBe('https://example.com/post?ref=test');

        expect(threadsUrl.origin + threadsUrl.pathname).toBe('https://www.threads.net/intent/post');
        expect(threadsUrl.searchParams.get('text')).toBe('Example post title https://example.com/post?ref=test');

        expect(blueskyUrl.origin + blueskyUrl.pathname).toBe('https://bsky.app/intent/compose');
        expect(blueskyUrl.searchParams.get('text')).toBe('Example post title https://example.com/post?ref=test');
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

        const expectedUrl = window.location.origin + window.location.pathname + window.location.search;
        expect(linkedInUrl.searchParams.get('url')).toBe(expectedUrl);

        const twitterLink = getByRole('link', {name: 'X (Twitter)'});
        const twitterUrl = new URL(twitterLink.getAttribute('href'));

        expect(twitterUrl.searchParams.get('text')).toBe('Document fallback title');
        expect(getByText('Document fallback title')).toBeInTheDocument();
        expect(getByText(window.location.hostname.replace(/^www\./, ''))).toBeInTheDocument();
        expect(queryByTestId('share-preview-image')).not.toBeInTheDocument();
    });

    test('opens and closes more options menu', () => {
        const {getByRole, getByText, queryByRole} = setup();

        const moreButton = getByRole('button', {name: 'More options'});
        expect(queryByRole('menu')).not.toBeInTheDocument();
        expect(moreButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(moreButton);
        expect(getByRole('menu')).toBeInTheDocument();
        expect(moreButton).toHaveAttribute('aria-expanded', 'true');

        fireEvent.mouseDown(getByText('Share'));
        expect(queryByRole('menu')).not.toBeInTheDocument();
        expect(moreButton).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(moreButton);
        expect(getByRole('menu')).toBeInTheDocument();

        fireEvent.keyDown(document, {key: 'Escape'});
        expect(queryByRole('menu')).not.toBeInTheDocument();
        expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('closes more options menu after selecting an item', () => {
        const {getByRole, queryByRole} = setup();

        fireEvent.click(getByRole('button', {name: 'More options'}));
        expect(getByRole('menu')).toBeInTheDocument();

        fireEvent.click(getByRole('menuitem', {name: 'Threads'}));
        expect(queryByRole('menu')).not.toBeInTheDocument();
    });

    test('shows copied state temporarily after successful copy', async () => {
        vi.useFakeTimers();
        copyTextToClipboard.mockResolvedValue(true);

        const {getByRole} = setup();

        const copyButton = getByRole('button', {name: 'Copy link'});
        fireEvent.click(copyButton);

        await waitFor(() => {
            const expectedUrl = window.location.origin + window.location.pathname + window.location.search;
            expect(copyTextToClipboard).toHaveBeenCalledWith(expectedUrl);
            expect(getByRole('button', {name: 'Copied'})).toBeInTheDocument();
        });

        vi.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(getByRole('button', {name: 'Copy link'})).toBeInTheDocument();
        });
    });
});
