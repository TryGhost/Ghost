import {fireEvent, screen, waitFor, within} from './utils/test-utils';
import ReactDOM from 'react-dom';

const unmountShareRoot = () => {
    const root = document.getElementById('ghost-portal-share-root');
    if (root) {
        ReactDOM.unmountComponentAtNode(root);
    }
};

const loadShareEntry = async ({hash = ''} = {}) => {
    unmountShareRoot();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    window.history.replaceState({}, '', `/post/${hash}`);

    const script = document.createElement('script');
    script.setAttribute('data-portal-share', 'true');
    script.setAttribute('data-locale', 'en');
    document.head.appendChild(script);

    vi.resetModules();
    await import('../src/share');
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};

const loadShareEntryWithAccentColor = async (accentColor) => {
    unmountShareRoot();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.style.overflow = '';
    document.body.style.marginRight = '';
    window.history.replaceState({}, '', '/post/#/share');

    const script = document.createElement('script');
    script.setAttribute('data-portal-share', 'true');
    script.setAttribute('data-locale', 'en');
    script.setAttribute('data-accent-color', accentColor);
    document.head.appendChild(script);

    vi.resetModules();
    await import('../src/share');
    await new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
};

const mockScrollbarWidth = (width) => {
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0);
};

const getShareFrameDocument = async () => {
    const frame = await screen.findByTitle('portal-share');
    await waitFor(() => {
        expect(within(frame.contentDocument).getByRole('heading', {name: 'Share'})).toBeInTheDocument();
    });
    return frame.contentDocument;
};

const expectShareFrameClosed = async () => {
    await waitFor(() => {
        expect(screen.queryByTitle('portal-share')).not.toBeInTheDocument();
    });
};

describe('share entry', () => {
    beforeEach(() => {
        document.body.style.overflow = '';
        document.body.style.marginRight = '';
    });

    afterEach(() => {
        unmountShareRoot();
        vi.restoreAllMocks();
        document.body.style.overflow = '';
        document.body.style.marginRight = '';
        window.history.replaceState({}, '', '/');
    });

    test('opens from initial share hash and closes from close button', async () => {
        mockScrollbarWidth(15);
        document.body.style.marginRight = '10px';

        await loadShareEntry({hash: '#/share'});

        expect(screen.queryByRole('heading', {name: 'Share'})).not.toBeInTheDocument();
        const frameDocument = await getShareFrameDocument();

        await waitFor(() => {
            expect(document.body.style.overflow).toBe('hidden');
            expect(document.body.style.marginRight).toBe('calc(25px)');
        });

        fireEvent.click(within(frameDocument).getByTestId('close-popup'));

        await expectShareFrameClosed();
        expect(document.body.style.overflow).toBe('');
        expect(document.body.style.marginRight).toBe('10px');
        expect(window.location.hash).toBe('');
    });

    test('uses accent color from script data inside iframe styles', async () => {
        await loadShareEntryWithAccentColor('#123456');

        const frame = await screen.findByTitle('portal-share');

        await waitFor(() => {
            expect(frame.contentDocument.head.textContent).toContain(':root { --brandcolor: #123456; }');
            expect(frame.contentDocument.head.textContent.indexOf('--brandcolor: #123456')).toBeGreaterThan(frame.contentDocument.head.textContent.indexOf('--brandcolor: var(--ghost-accent-color, #3eb0ef)'));
        });
    });

    test('opens from hashchange', async () => {
        await loadShareEntry();

        expect(screen.queryByRole('heading', {name: 'Share'})).not.toBeInTheDocument();
        expect(screen.queryByTitle('portal-share')).not.toBeInTheDocument();

        window.history.replaceState({}, '', '/post/#/share');
        fireEvent(window, new HashChangeEvent('hashchange'));

        await getShareFrameDocument();
    });

    test('opens from share links and data portal triggers', async () => {
        await loadShareEntry();

        const link = document.createElement('a');
        link.href = `${window.location.origin}/post/#/share`;
        link.textContent = 'Share link';
        document.body.appendChild(link);

        fireEvent.click(link);

        let frameDocument = await getShareFrameDocument();

        expect(window.location.pathname).toBe('/post/');
        expect(window.location.hash).toBe('#/share');

        fireEvent.click(within(frameDocument).getByTestId('close-popup'));

        await expectShareFrameClosed();
        expect(window.location.hash).toBe('');

        const absoluteLink = document.createElement('a');
        absoluteLink.href = `${window.location.origin}/#/share`;
        absoluteLink.textContent = 'Absolute share link';
        document.body.appendChild(absoluteLink);

        fireEvent.click(absoluteLink);

        frameDocument = await getShareFrameDocument();
        expect(window.location.pathname).toBe('/post/');
        expect(window.location.hash).toBe('#/share');

        fireEvent.click(within(frameDocument).getByTestId('close-popup'));

        await expectShareFrameClosed();
        expect(window.location.hash).toBe('');

        const button = document.createElement('button');
        button.dataset.portal = 'share';
        button.textContent = 'Share';
        document.body.appendChild(button);

        fireEvent.click(button);

        await getShareFrameDocument();
        expect(window.location.hash).toBe('');
    });

    test('closes from backdrop and Escape', async () => {
        await loadShareEntry({hash: '#/share'});

        let frameDocument = await getShareFrameDocument();
        fireEvent.click(frameDocument.querySelector('.gh-portal-popup-background'));

        await expectShareFrameClosed();

        window.history.replaceState({}, '', '/post/#/share');
        fireEvent(window, new HashChangeEvent('hashchange'));
        frameDocument = await getShareFrameDocument();

        fireEvent.keyUp(frameDocument, {key: 'Escape'});

        await expectShareFrameClosed();
        expect(document.body.style.overflow).toBe('');
    });
});
